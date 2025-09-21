import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/m');
  }, [router]);

  return null;
}
