export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600">
            © {year} CareerOS. All rights reserved.
          </div>

          <div className="flex items-center gap-4 text-sm">
            <a
              href="/privacy"
              className="text-gray-600 hover:text-gray-900"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="text-gray-600 hover:text-gray-900"
            >
              Terms
            </a>
            <a
              href="mailto:support@careeros.app"
              className="text-gray-600 hover:text-gray-900"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

