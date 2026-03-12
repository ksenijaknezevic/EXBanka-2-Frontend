import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-6xl font-bold text-primary-900">404</h1>
      <p className="mt-4 text-lg text-gray-600">Stranica nije pronađena.</p>
      <Link
        to="/"
        className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-800 underline"
      >
        Povratak na početnu
      </Link>
    </div>
  )
}
