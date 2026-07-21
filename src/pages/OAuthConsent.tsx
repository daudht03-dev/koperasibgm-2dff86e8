import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, AlertTriangle } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] };
  scope?: string;
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
  user?: { email?: string };
};

// Local typed wrapper — the `auth.oauth` namespace is beta.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};
const oauth = ((supabase.auth as unknown as { oauth: OAuthApi }).oauth) ?? null;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      if (!oauth) {
        setError("OAuth support is unavailable in this build. Please update the app.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    if (!oauth) return;
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-natural">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>Authorization error</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-natural">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading authorization request...
        </div>
      </div>
    );
  }

  const clientName = details.client?.name ?? "an application";
  const scopeList =
    details.scopes ??
    (typeof details.scope === "string" ? details.scope.split(/\s+/).filter(Boolean) : []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-natural">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Connect {clientName} to Berkah Gendis Mandiri</CardTitle>
          </div>
          <CardDescription>
            {clientName} will be able to call this app's enabled tools while you are signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <div className="text-sm">
              <span className="text-muted-foreground">Signed in as: </span>
              <span className="font-medium">{userEmail}</span>
            </div>
          )}
          <div className="text-sm">
            <p className="font-medium mb-1">This lets {clientName} use this app as you.</p>
            <p className="text-muted-foreground">
              This does not bypass this app's permissions or backend policies.
            </p>
          </div>
          {scopeList.length > 0 && (
            <div className="text-sm">
              <div className="font-medium mb-1">Requested permissions</div>
              <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                {scopeList.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
            </Button>
            <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
              Cancel connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
