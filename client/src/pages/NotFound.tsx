import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-4xl font-bold text-navy-900">404</p>
      <p className="mt-2 text-slate-500">This page doesn't exist.</p>
      <Link to="/" className="mt-4 text-brand-600 hover:underline">Back to Dashboard</Link>
    </div>
  );
}
