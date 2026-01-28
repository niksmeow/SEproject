from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from typing import List, Dict, Optional
import time
import random
import logging
from urllib.parse import quote_plus
import re
from functools import wraps
import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def _extract_country_from_location(location: str) -> Optional[str]:
    """Extract country code from location string if it contains a country name"""
    if not location:
        return None
    
    location_lower = location.lower().strip()
    
    # Map of country names/aliases to JSearch country codes
    country_map = {
        "india": "in",
        "united states": "us",
        "usa": "us",
        "us": "us",
        "united kingdom": "gb",
        "uk": "gb",
        "canada": "ca",
        "australia": "au",
        "germany": "de",
        "france": "fr",
        "spain": "es",
        "italy": "it",
        "netherlands": "nl",
        "brazil": "br",
        "mexico": "mx",
        "japan": "jp",
        "china": "cn",
        "south korea": "kr",
        "singapore": "sg",
        "uae": "ae",
        "united arab emirates": "ae",
    }
    
    # Check if location contains any country name
    for country_name, country_code in country_map.items():
        if country_name in location_lower:
            return country_code
    
    return None


def retry_with_backoff(max_retries=3, initial_delay=1, backoff_factor=2):
    """Retry decorator with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        logger.error(f"All {max_retries} attempts failed")
            
            raise last_exception
        return wrapper
    return decorator


class JobCrawler:
    def __init__(self):
        self.rate_limit_delay = random.uniform(2, 5)  # Random delay between requests
        self.user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
        ]
    
    def _create_stealth_browser(self, playwright):
        """Create browser with stealth settings to avoid detection"""
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        )
        
        context = browser.new_context(
            user_agent=random.choice(self.user_agents),
            viewport={'width': 1920, 'height': 1080},
            locale='en-US',
            timezone_id='America/New_York',
            permissions=['geolocation'],
            geolocation={'latitude': 40.7128, 'longitude': -74.0060},
            color_scheme='light'
        )
        
        # Add stealth scripts to avoid detection
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            window.chrome = {
                runtime: {}
            };
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)
        
        return browser, context
    
    @retry_with_backoff(max_retries=3)
    def crawl_indeed_jobs(
        self,
        keywords: str,
        location: str = "",
        limit: int = 10
    ) -> List[Dict]:
        """Crawl Indeed Jobs with improved reliability"""
        jobs = []
        
        try:
            with sync_playwright() as p:
                browser, context = self._create_stealth_browser(p)
                page = context.new_page()
                
                # Encode URL parameters
                keywords_encoded = quote_plus(keywords)
                location_encoded = quote_plus(location) if location else ""
                
                search_url = f"https://www.indeed.com/jobs?q={keywords_encoded}&l={location_encoded}"
                
                logger.info(f"Crawling Indeed: {keywords} in {location}")
                
                # Navigate with timeout
                page.goto(search_url, wait_until="networkidle", timeout=30000)
                
                # Wait for job cards to load
                try:
                    page.wait_for_selector('[data-jk]', timeout=10000)
                except PlaywrightTimeoutError:
                    # Try alternative selector
                    page.wait_for_selector('.job_seen_beacon', timeout=5000)
                
                time.sleep(random.uniform(2, 4))
                
                # Try multiple selector strategies
                job_cards = page.query_selector_all('[data-jk]')
                
                if not job_cards:
                    # Fallback: try alternative selectors
                    job_cards = page.query_selector_all('.job_seen_beacon')
                
                logger.info(f"Found {len(job_cards)} job cards on Indeed")
                
                for i, card in enumerate(job_cards[:limit]):
                    try:
                        # Extract job ID
                        job_id = card.get_attribute('data-jk')
                        if not job_id:
                            continue
                        
                        # Multiple selector strategies for title
                        title = None
                        url = None
                        title_selectors = [
                            'h2.jobTitle a',
                            'h2 a[data-jk]',
                            'h2 a span[title]',
                            'h2 a',
                            'a[data-jk]'
                        ]
                        
                        for selector in title_selectors:
                            title_elem = card.query_selector(selector)
                            if title_elem:
                                title = title_elem.inner_text().strip()
                                url = title_elem.get_attribute('href')
                                if title and url:
                                    break
                        
                        if not title:
                            continue
                        
                        # Fix URL
                        if url and not url.startswith('http'):
                            url = f"https://www.indeed.com{url}"
                        
                        # Extract company (multiple strategies)
                        company = ""
                        company_selectors = [
                            '[data-testid="company-name"]',
                            '.companyName',
                            'span[data-testid="company-name"]',
                            'a[data-testid="company-name"]',
                            '.companyName a'
                        ]
                        
                        for selector in company_selectors:
                            company_elem = card.query_selector(selector)
                            if company_elem:
                                company = company_elem.inner_text().strip()
                                break
                        
                        # Extract location
                        location_text = location
                        location_selectors = [
                            '[data-testid="text-location"]',
                            '.companyLocation',
                            'div[data-testid="text-location"]',
                            '[data-testid="text-location"]'
                        ]
                        
                        for selector in location_selectors:
                            location_elem = card.query_selector(selector)
                            if location_elem:
                                location_text = location_elem.inner_text().strip()
                                break
                        
                        # Extract salary if available
                        salary = ""
                        salary_selectors = [
                            '.salary-snippet-container',
                            '.attribute_snippet',
                            '[data-testid="attribute_snippet_testid"]'
                        ]
                        
                        for selector in salary_selectors:
                            salary_elem = card.query_selector(selector)
                            if salary_elem:
                                salary = salary_elem.inner_text().strip()
                                break
                        
                        # Get full job description
                        description = ""
                        posted_date = ""
                        
                        if url:
                            try:
                                detail_page = context.new_page()
                                detail_page.goto(url, wait_until="domcontentloaded", timeout=15000)
                                
                                # Wait for description
                                desc_selectors = [
                                    '#jobDescriptionText',
                                    '.jobsearch-jobDescriptionText',
                                    '[id*="jobDescriptionText"]',
                                    '.jobsearch-JobComponent-description'
                                ]
                                
                                for desc_selector in desc_selectors:
                                    try:
                                        detail_page.wait_for_selector(desc_selector, timeout=5000)
                                        desc_elem = detail_page.query_selector(desc_selector)
                                        if desc_elem:
                                            description = desc_elem.inner_text()
                                            break
                                    except:
                                        continue
                                
                                # Extract posted date
                                date_selectors = [
                                    '.jobsearch-JobMetadataFooter-date',
                                    '[data-testid="job-date"]',
                                    '.date'
                                ]
                                
                                for date_selector in date_selectors:
                                    date_elem = detail_page.query_selector(date_selector)
                                    if date_elem:
                                        posted_date = date_elem.inner_text().strip()
                                        break
                                
                                detail_page.close()
                                time.sleep(random.uniform(1, 3))  # Rate limiting
                                
                            except Exception as e:
                                logger.warning(f"Error fetching job description for {title}: {e}")
                        
                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": location_text,
                            "description": description,
                            "url": url,
                            "source": "indeed",
                            "salary": salary,
                            "posted_date": posted_date,
                            "job_id": job_id
                        })
                        
                        logger.info(f"Extracted job {i+1}/{min(limit, len(job_cards))}: {title} at {company}")
                        
                    except Exception as e:
                        logger.error(f"Error extracting job {i+1}: {e}")
                        continue
                
                browser.close()
                
        except PlaywrightTimeoutError:
            logger.error("Timeout while loading Indeed page")
        except Exception as e:
            logger.error(f"Error crawling Indeed: {e}")
            raise
        
        return jobs

    def crawl_adzuna_jobs(
        self,
        keywords: str,
        location: str = "",
        limit: int = 10
    ) -> List[Dict]:
        """Fetch jobs from Adzuna API"""
        jobs = []

        if not settings.adzuna_app_id or not settings.adzuna_api_key:
            logger.warning("Adzuna credentials not configured. Set ADZUNA_APP_ID and ADZUNA_API_KEY.")
            return jobs

        try:
            country = (settings.adzuna_country or "us").lower()
            url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"

            params = {
                "app_id": settings.adzuna_app_id,
                "app_key": settings.adzuna_api_key,
                "what": keywords,
                "where": location or "",
                "results_per_page": min(max(limit, 1), 50),
                "content-type": "application/json",
            }

            logger.info(f"Fetching Adzuna jobs: {keywords} in {location} ({country})")
            response = requests.get(url, params=params, timeout=20)
            response.raise_for_status()
            data = response.json()

            for job in data.get("results", []):
                jobs.append({
                    "title": job.get("title", ""),
                    "company": (job.get("company") or {}).get("display_name", ""),
                    "location": (job.get("location") or {}).get("display_name", location),
                    "description": job.get("description", ""),
                    "url": job.get("redirect_url") or job.get("adref"),
                    "source": "adzuna"
                })

        except Exception as e:
            logger.error(f"Error fetching Adzuna jobs: {e}")

        return jobs
    
    def _is_retryable_error(self, status_code: int) -> bool:
        """Check if HTTP status code indicates a retryable error"""
        # Retry on server errors (500, 502, 503, 504) but not on client errors
        return status_code in [500, 502, 503, 504]
    
    def _parse_jsearch_error(self, response) -> str:
        """Parse error message from JSearch API response"""
        try:
            error_data = response.json()
            if isinstance(error_data, dict):
                error_obj = error_data.get("error", {})
                if isinstance(error_obj, dict):
                    return error_obj.get("message", "Unknown error from JSearch API")
                return str(error_obj)
            return str(error_data)
        except:
            return response.text[:200] if hasattr(response, 'text') else "Unknown error"
    
    def crawl_jsearch_jobs(
        self,
        keywords: str = "",
        location: str = "",
        limit: int = 10,
        skills: Optional[List[str]] = None
    ) -> List[Dict]:
        """Fetch jobs from JSearch API (via RapidAPI) with retry logic and fallback"""
        jobs = []

        if not settings.jsearch_api_key:
            logger.warning("JSearch API key not configured. Set JSEARCH_API_KEY in .env")
            return jobs

        url = "https://jsearch.p.rapidapi.com/search"

        headers = {
            "X-RapidAPI-Key": settings.jsearch_api_key,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }

        # Build query: prioritize keywords over skills
        # If keywords are provided, use them as PRIMARY query
        if keywords and keywords.strip():
            query = keywords.strip()  # Use keywords as primary search term
            # Don't combine with skills - keywords take priority
        elif skills and len(skills) > 0:
            # Only use skills if no keywords provided
            top_skills = skills[:5]
            query = " OR ".join(top_skills) if len(top_skills) > 1 else top_skills[0]
        else:
            query = "software engineer"  # Default fallback

        # Calculate number of pages needed (JSearch returns ~10 jobs per page)
        num_pages_needed = max(1, (limit + 9) // 10)  # Round up to get enough pages
        
        params = {
            "query": query,
            "page": "1",
            "num_pages": str(num_pages_needed),  # Fetch multiple pages to get more jobs
            "date_posted": "all",  # all, today, 3days, week, month
            "remote_jobs_only": "false",
            "employment_types": "FULLTIME,PARTTIME,CONTRACTOR",  # FULLTIME, PARTTIME, CONTRACTOR, INTERN
        }

        # Location/country handling: only set if explicitly provided
        # Don't default to any country - allow global search
        if location and location.strip():
            location_clean = location.strip()
            # Check if location contains a country name
            detected_country = _extract_country_from_location(location_clean)
            
            if detected_country:
                # Location contains a country - use country parameter
                params["country"] = detected_country
                # If location has more than just country (e.g., "New York, US"), also set location
                # But if it's just "india" or "us", only set country
                location_parts = [p.strip() for p in location_clean.split(",")]
                if len(location_parts) > 1 or any(city_word in location_clean.lower() for city_word in ["city", "state", "province", "region"]):
                    # Has city/region info, use location parameter
                    params["location"] = location_clean
            else:
                # Location is a city/region, not a country - use location parameter
                params["location"] = location_clean
        # If no location provided, don't set country or location - allows global search

        # Retry logic with exponential backoff
        max_retries = 3
        retry_delay = 1  # Start with 1 second
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Fetching JSearch jobs (attempt {attempt + 1}/{max_retries}): query='{query}' location='{location or 'global'}' skills={len(skills) if skills else 0}")
                response = requests.get(url, headers=headers, params=params, timeout=20)
                
                # Check for JSearch-specific error format
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if response indicates an error
                        if data.get("status") == "ERROR":
                            error_msg = self._parse_jsearch_error(response)
                            logger.warning(f"JSearch API returned error status: {error_msg}")
                            # If it's a server error, retry
                            error_code = data.get("error", {}).get("code", 0)
                            if error_code == 500 and attempt < max_retries - 1:
                                logger.info(f"Retrying after {retry_delay}s due to 500 error...")
                                time.sleep(retry_delay)
                                retry_delay *= 2  # Exponential backoff
                                continue
                            # Non-retryable error, break
                            break
                    except ValueError:
                        # Invalid JSON, might be HTML error page
                        if attempt < max_retries - 1:
                            logger.warning(f"Invalid JSON response, retrying after {retry_delay}s...")
                            time.sleep(retry_delay)
                            retry_delay *= 2
                            continue
                        break
                
                # Check HTTP status code
                if response.status_code == 200:
                    data = response.json()
                    # JSearch returns data in 'data' field
                    job_listings = data.get("data", [])
                    
                    for job in job_listings[:limit]:
                        # Build location string from available fields
                        location_parts = []
                        if job.get("job_city"):
                            location_parts.append(job.get("job_city"))
                        if job.get("job_state"):
                            location_parts.append(job.get("job_state"))
                        if job.get("job_country"):
                            location_parts.append(job.get("job_country"))
                        
                        # Use job's location if available, otherwise fall back to requested location
                        if location_parts:
                            job_location = ", ".join(location_parts)
                        elif location:
                            job_location = location
                        else:
                            job_location = "Remote"  # Default if no location info
                        
                        jobs.append({
                            "title": job.get("job_title", ""),
                            "company": job.get("employer_name", ""),
                            "location": job_location,
                            "description": job.get("job_description", ""),
                            "url": job.get("job_apply_link") or job.get("job_google_link", ""),
                            "source": "jsearch"
                        })

                    logger.info(f"Fetched {len(jobs)} jobs from JSearch")
                    return jobs  # Success, return jobs
                
                elif self._is_retryable_error(response.status_code):
                    # Retryable server error
                    if attempt < max_retries - 1:
                        error_msg = self._parse_jsearch_error(response)
                        logger.warning(f"JSearch returned {response.status_code}: {error_msg}. Retrying after {retry_delay}s...")
                        time.sleep(retry_delay)
                        retry_delay *= 2  # Exponential backoff
                        continue
                    else:
                        # Last attempt failed
                        error_msg = self._parse_jsearch_error(response)
                        logger.error(f"JSearch failed after {max_retries} attempts: {error_msg}")
                        break
                else:
                    # Non-retryable error (401, 403, 404, etc.)
                    error_msg = self._parse_jsearch_error(response)
                    logger.error(f"JSearch returned non-retryable error {response.status_code}: {error_msg}")
                    break
                    
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    logger.warning(f"JSearch request timed out. Retrying after {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    logger.error("JSearch request timed out after all retries")
                    break
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    logger.warning(f"JSearch request error: {e}. Retrying after {retry_delay}s...")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                else:
                    logger.error(f"JSearch request failed after all retries: {e}")
                    break
            except Exception as e:
                logger.error(f"Unexpected error fetching JSearch jobs: {e}")
                break

        # If JSearch failed, try fallback to Adzuna if configured
        if not jobs and settings.adzuna_app_id and settings.adzuna_api_key:
            logger.info("JSearch failed, falling back to Adzuna API...")
            try:
                adzuna_jobs = self.crawl_adzuna_jobs(keywords, location, limit)
                if adzuna_jobs:
                    logger.info(f"Fallback to Adzuna successful: found {len(adzuna_jobs)} jobs")
                    return adzuna_jobs
                else:
                    logger.warning("Adzuna fallback returned no jobs")
            except Exception as e:
                logger.error(f"Adzuna fallback also failed: {e}")

        return jobs
    
    def crawl_linkedin_jobs(
        self,
        keywords: str,
        location: str = "",
        limit: int = 10,
        email: Optional[str] = None,
        password: Optional[str] = None
    ) -> List[Dict]:
        """Crawl LinkedIn Jobs with optional authentication"""
        jobs = []
        
        if not email or not password:
            logger.warning("LinkedIn requires authentication. Skipping...")
            return jobs
        
        try:
            with sync_playwright() as p:
                browser, context = self._create_stealth_browser(p)
                page = context.new_page()
                
                logger.info("Logging into LinkedIn...")
                
                # Login to LinkedIn
                page.goto("https://www.linkedin.com/login", wait_until="networkidle", timeout=30000)
                time.sleep(2)
                
                page.fill('#username', email)
                page.fill('#password', password)
                page.click('button[type="submit"]')
                
                # Wait for login to complete
                try:
                    page.wait_for_url("**/feed/**", timeout=15000)
                    logger.info("LinkedIn login successful")
                except PlaywrightTimeoutError:
                    logger.error("LinkedIn login failed or timed out")
                    browser.close()
                    return jobs
                
                time.sleep(2)
                
                # Navigate to jobs
                keywords_encoded = quote_plus(keywords)
                location_encoded = quote_plus(location) if location else ""
                
                search_url = f"https://www.linkedin.com/jobs/search/?keywords={keywords_encoded}&location={location_encoded}"
                
                logger.info(f"Crawling LinkedIn: {keywords} in {location}")
                
                page.goto(search_url, wait_until="networkidle", timeout=30000)
                time.sleep(3)
                
                # Wait for job cards
                try:
                    page.wait_for_selector('.jobs-search-results__list-item', timeout=10000)
                except PlaywrightTimeoutError:
                    logger.warning("No job cards found on LinkedIn")
                    browser.close()
                    return jobs
                
                # Scroll to load more jobs
                for _ in range(2):
                    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    time.sleep(1)
                
                job_cards = page.query_selector_all('.jobs-search-results__list-item')
                
                logger.info(f"Found {len(job_cards)} job cards on LinkedIn")
                
                for i, card in enumerate(job_cards[:limit]):
                    try:
                        # Extract job data
                        title_elem = card.query_selector('.job-search-card__title a')
                        if not title_elem:
                            continue
                        
                        title = title_elem.inner_text().strip()
                        url = title_elem.get_attribute('href')
                        
                        if url and not url.startswith('http'):
                            url = f"https://www.linkedin.com{url}"
                        
                        company_elem = card.query_selector('.job-search-card__subtitle a')
                        company = company_elem.inner_text().strip() if company_elem else ""
                        
                        location_elem = card.query_selector('.job-search-card__location')
                        location_text = location_elem.inner_text().strip() if location_elem else location
                        
                        # Get description from detail page
                        description = ""
                        if url:
                            try:
                                detail_page = context.new_page()
                                detail_page.goto(url, wait_until="domcontentloaded", timeout=15000)
                                time.sleep(2)
                                
                                desc_elem = detail_page.query_selector('.show-more-less-html__markup')
                                if desc_elem:
                                    description = desc_elem.inner_text()
                                
                                detail_page.close()
                                time.sleep(random.uniform(1, 3))
                            except Exception as e:
                                logger.warning(f"Error fetching LinkedIn job description: {e}")
                        
                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": location_text,
                            "description": description,
                            "url": url,
                            "source": "linkedin"
                        })
                        
                        logger.info(f"Extracted LinkedIn job {i+1}/{min(limit, len(job_cards))}: {title} at {company}")
                        
                    except Exception as e:
                        logger.error(f"Error extracting LinkedIn job: {e}")
                        continue
                
                browser.close()
                
        except Exception as e:
            logger.error(f"Error crawling LinkedIn: {e}")
        
        return jobs
    
    def crawl_glassdoor_jobs(
        self,
        keywords: str,
        location: str = "",
        limit: int = 10
    ) -> List[Dict]:
        """Crawl Glassdoor Jobs"""
        jobs = []
        
        try:
            with sync_playwright() as p:
                browser, context = self._create_stealth_browser(p)
                page = context.new_page()
                
                keywords_encoded = quote_plus(keywords)
                location_encoded = quote_plus(location) if location else ""
                
                search_url = f"https://www.glassdoor.com/Job/jobs.htm?sc.keyword={keywords_encoded}&locT=C&locId={location_encoded}"
                
                logger.info(f"Crawling Glassdoor: {keywords} in {location}")
                
                page.goto(search_url, wait_until="networkidle", timeout=30000)
                time.sleep(3)
                
                # Handle popups/cookies
                try:
                    accept_button = page.query_selector('button:has-text("Accept"), button:has-text("I Accept")')
                    if accept_button:
                        accept_button.click()
                        time.sleep(1)
                except:
                    pass
                
                # Wait for job listings
                try:
                    page.wait_for_selector('[data-test="job-listing"]', timeout=10000)
                except PlaywrightTimeoutError:
                    logger.warning("No job listings found on Glassdoor")
                    browser.close()
                    return jobs
                
                job_cards = page.query_selector_all('[data-test="job-listing"]')
                
                logger.info(f"Found {len(job_cards)} job cards on Glassdoor")
                
                for i, card in enumerate(job_cards[:limit]):
                    try:
                        title_elem = card.query_selector('a[data-test="job-link"]')
                        if not title_elem:
                            continue
                        
                        title = title_elem.inner_text().strip()
                        url = title_elem.get_attribute('href')
                        if url and not url.startswith('http'):
                            url = f"https://www.glassdoor.com{url}"
                        
                        company_elem = card.query_selector('[data-test="employer-name"]')
                        company = company_elem.inner_text().strip() if company_elem else ""
                        
                        location_elem = card.query_selector('[data-test="job-location"]')
                        location_text = location_elem.inner_text().strip() if location_elem else location
                        
                        # Get description
                        description = ""
                        if url:
                            try:
                                detail_page = context.new_page()
                                detail_page.goto(url, wait_until="domcontentloaded", timeout=15000)
                                time.sleep(2)
                                
                                desc_elem = detail_page.query_selector('.jobDesc')
                                if desc_elem:
                                    description = desc_elem.inner_text()
                                
                                detail_page.close()
                                time.sleep(random.uniform(1, 3))
                            except Exception as e:
                                logger.warning(f"Error fetching Glassdoor job description: {e}")
                        
                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": location_text,
                            "description": description,
                            "url": url,
                            "source": "glassdoor"
                        })
                        
                        logger.info(f"Extracted Glassdoor job {i+1}/{min(limit, len(job_cards))}: {title} at {company}")
                        
                    except Exception as e:
                        logger.error(f"Error extracting Glassdoor job: {e}")
                        continue
                
                browser.close()
                
        except Exception as e:
            logger.error(f"Error crawling Glassdoor: {e}")
        
        return jobs
    
    def crawl_google_jobs(
        self,
        keywords: str,
        location: str = "",
        limit: int = 10
    ) -> List[Dict]:
        """Crawl Google Jobs search results"""
        jobs = []
        
        try:
            with sync_playwright() as p:
                browser, context = self._create_stealth_browser(p)
                page = context.new_page()
                
                keywords_encoded = quote_plus(keywords)
                location_encoded = quote_plus(location) if location else ""
                
                search_url = f"https://www.google.com/search?q={keywords_encoded}+jobs+{location_encoded}&ibp=htl;jobs"
                
                logger.info(f"Crawling Google Jobs: {keywords} in {location}")
                
                page.goto(search_url, wait_until="networkidle", timeout=30000)
                time.sleep(3)
                
                # Google Jobs uses structured data in search results
                job_cards = page.query_selector_all('[data-ved], .g, .job-card')
                
                if not job_cards:
                    # Try alternative selectors
                    job_cards = page.query_selector_all('.PwjeAc, .BjJfJf')
                
                logger.info(f"Found {len(job_cards)} job cards on Google Jobs")
                
                for i, card in enumerate(job_cards[:limit]):
                    try:
                        # Try multiple selectors for title
                        title = None
                        title_selectors = ['h2', '.BjJfJf', '.PwjeAc', 'h3']
                        
                        for selector in title_selectors:
                            title_elem = card.query_selector(selector)
                            if title_elem:
                                title = title_elem.inner_text().strip()
                                if title:
                                    break
                        
                        if not title:
                            continue
                        
                        # Extract company
                        company = ""
                        company_selectors = ['.vNEEBe', '.nJlQNd', '.Qk80Jf']
                        
                        for selector in company_selectors:
                            company_elem = card.query_selector(selector)
                            if company_elem:
                                text = company_elem.inner_text().strip()
                                # Sometimes location is in same element, extract company part
                                if '·' in text:
                                    company = text.split('·')[0].strip()
                                else:
                                    company = text
                                break
                        
                        # Extract location
                        location_text = location
                        location_selectors = ['.Qk80Jf', '.vNEEBe']
                        
                        for selector in location_selectors:
                            location_elem = card.query_selector(selector)
                            if location_elem:
                                text = location_elem.inner_text().strip()
                                if '·' in text:
                                    location_text = text.split('·')[-1].strip()
                                else:
                                    location_text = text
                                break
                        
                        # Click to expand description
                        try:
                            card.click()
                            time.sleep(1)
                            
                            desc_elem = page.query_selector('.YgLbBe, .HBvzbc, .job-description')
                            description = desc_elem.inner_text() if desc_elem else ""
                        except:
                            description = ""
                        
                        jobs.append({
                            "title": title,
                            "company": company,
                            "location": location_text,
                            "description": description,
                            "url": search_url,
                            "source": "google"
                        })
                        
                        logger.info(f"Extracted Google job {i+1}/{min(limit, len(job_cards))}: {title} at {company}")
                        
                    except Exception as e:
                        logger.error(f"Error extracting Google job: {e}")
                        continue
                
                browser.close()
                
        except Exception as e:
            logger.error(f"Error crawling Google Jobs: {e}")
        
        return jobs
    
    def is_duplicate_job(self, job_data: Dict, existing_jobs: List[Dict]) -> bool:
        """Check if job already exists based on title, company, and URL"""
        if not existing_jobs:
            return False
        
        # Normalize job data
        new_title = (job_data.get("title") or "").lower().strip()
        new_company = (job_data.get("company") or "").lower().strip()
        new_url = (job_data.get("url") or "").strip()
        
        for existing in existing_jobs:
            # Normalize existing job data
            existing_title = (existing.get("title") or "").lower().strip()
            existing_company = (existing.get("company") or "").lower().strip()
            existing_url = (existing.get("url") or "").strip()
            
            # Skip if both title and company are empty
            if not new_title and not new_company:
                continue
            
            # Check by title and company (both must match)
            if new_title and new_company and existing_title and existing_company:
                if new_title == existing_title and new_company == existing_company:
                    logger.debug(f"Duplicate found by title+company: {new_title} at {new_company}")
                    return True
            
            # Check by URL (exact match)
            if new_url and existing_url and new_url == existing_url:
                logger.debug(f"Duplicate found by URL: {new_url}")
                return True
        
        return False
    
    def extract_skills_from_description(self, description: str) -> List[str]:
        """Extract required skills using keyword matching and NLP"""
        if not description:
            return []
        
        # Enhanced skill list with variations
        skill_keywords = {
            "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
            "react", "vue", "angular", "node.js", "nodejs", "express", "django", "flask",
            "fastapi", "spring", "laravel", "rails", "next.js", "nextjs", "nuxt",
            "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "k8s", "terraform",
            "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
            "git", "github", "gitlab", "jenkins", "ci/cd", "cicd", "github actions",
            "machine learning", "ml", "deep learning", "tensorflow", "pytorch",
            "data science", "pandas", "numpy", "scikit-learn", "sklearn",
            "graphql", "rest api", "rest", "microservices", "serverless",
            "agile", "scrum", "kanban", "jira", "confluence",
            "html", "css", "sass", "less", "bootstrap", "tailwind",
            "redux", "mobx", "webpack", "vite", "npm", "yarn",
            "linux", "unix", "bash", "shell scripting",
            "sql", "nosql", "orm", "prisma", "sequelize"
        }
        
        description_lower = description.lower()
        found_skills = []
        
        # Direct keyword matching
        for skill in skill_keywords:
            # Use word boundaries for better matching
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, description_lower):
                # Capitalize properly
                if ' ' in skill:
                    found_skills.append(skill.title())
                else:
                    found_skills.append(skill.capitalize())
        
        # Remove duplicates and return
        return sorted(list(set(found_skills)))


job_crawler = JobCrawler()
