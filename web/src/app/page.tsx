import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

// Root "/" redirects: authenticated → /home, unauthenticated → /sign-in
export default async function RootPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/home');
  } else {
    redirect('/sign-in');
  }
}
