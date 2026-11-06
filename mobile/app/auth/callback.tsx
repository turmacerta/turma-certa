import { Redirect } from "expo-router";
import { LoadingBlock } from "../../src/ui/Screen";
import { useAuth } from "../../src/lib/auth";

export default function AuthCallback() {
  const { status } = useAuth();
  if (status === "loading") return <LoadingBlock />;
  return <Redirect href="/" />;
}
