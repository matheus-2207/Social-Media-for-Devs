import { AuthForm } from "@/components/auth-form";

export default function LoginPage({ searchParams }: { searchParams: { registered?: string } }) {
  return <AuthForm mode="login" registered={searchParams.registered === "1"} />;
}
