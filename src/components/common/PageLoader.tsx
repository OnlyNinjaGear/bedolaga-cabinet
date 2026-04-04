interface PageLoaderProps {
  variant?: 'dark' | 'light';
}

export default function PageLoader({ variant = 'dark' }: PageLoaderProps) {
  const spinnerColor = variant === 'dark' ? 'border-primary' : 'border-blue-500';

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div
        className={`h-10 w-10 border-3 ${spinnerColor} animate-spin rounded-full border-t-transparent`}
      />
    </div>
  );
}
