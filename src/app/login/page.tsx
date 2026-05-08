import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/auth?view=sign_in');
}
