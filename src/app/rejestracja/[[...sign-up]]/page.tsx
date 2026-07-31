import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const requestedRedirect = (await searchParams).redirect_url;
  const redirectUrl = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
    ? requestedRedirect
    : undefined;
  return <AuthScreen mode="sign-up" redirectUrl={redirectUrl} />;
}
