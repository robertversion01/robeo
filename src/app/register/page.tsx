import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/auth?view=sign_up');
}
