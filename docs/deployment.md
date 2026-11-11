# dashboard.jedherne.com deployment

Bluehost is the domain/DNS provider and reported hosting provider. The exact plan's Node.js support, hosting control panel access, deployment destination and TLS setup are still unconfirmed. Do not point DNS at a guessed address or delete existing DNS records.

## Completed

Supabase tables and initial dataset are populated. Remote counts and financial totals were verified after import. The Express API now reads Supabase. Staff authentication restricts access to the explicit email allowlist; default authorized email is simon@jedherne.com. No staff Auth account existed at verification time.

## Staff account setup

In Supabase Authentication, invite simon@jedherne.com or have the owner create and verify that account, then set its password through Supabase's supported account setup/reset flow. Do not send passwords in chat or store them in the repository. The app uses Supabase email/password sign-in and an HttpOnly, SameSite=Strict cookie. Production cookies are Secure, and expire within one hour; sign in again after expiration. There is no public signup route.

The email allowlist is enforced by the server on every protected API request after verifying the user with Supabase Auth. A valid student login alone grants no financial access. Login requests have an in-process rate limit; scale-out hosting needs an ingress/shared rate limiter. Account invitation emails have not been sent by this setup.

## Hosting prerequisites

This is a Node.js 24.5+ Express application, not a PHP app or static site. Bluehost must support a persistent Node process or an appropriate application manager. If the current Bluehost plan does not support it, retain Bluehost DNS and deploy the application to a Node-capable service instead. The included Dockerfile is an alternative for container-capable hosting; it has not been built or deployed in this session.

Build: `npm ci && npm run build` (build requires dev dependencies).
Start: `npm start`.
Bind: `HOST=0.0.0.0`, `PORT` from the hosting platform.
Health check: `/healthz`.

Set these values securely in the hosting environment, not Git:

- NODE_ENV=production
- HOST=0.0.0.0
- APP_ORIGIN=https://dashboard.jedherne.com
- AUTH_REQUIRED=true
- STAFF_EMAILS=simon@jedherne.com
- SUPABASE_URL=https://tmqzvavoknokdydgskew.supabase.co
- SUPABASE_PUBLISHABLE_KEY from project settings
- SUPABASE_SERVICE_ROLE_KEY from project settings (server-only)

The server starts with Node's `--use-env-proxy` option so inherited cloud HTTPS proxy settings work. A normal host without proxy variables connects normally. No private local snapshot should be uploaded to public/static hosting. Supabase keys never enter frontend JavaScript.

## DNS and TLS

1. Obtain the actual host IP or CNAME target from the verified application hosting setup.
2. In Bluehost DNS for jedherne.com, add/update only host `dashboard` using the hosting provider's required A or CNAME record. Preserve root, www, mail, MX, SPF, DKIM and other records. A CNAME cannot coexist with other records at that same host.
3. Register dashboard.jedherne.com as a custom domain on the application host and provision its TLS certificate.
4. Set APP_ORIGIN to the final HTTPS origin before testing login. Configure Supabase Auth's Site URL / allowed redirect URLs if using invitations or reset links.
5. Verify HTTPS loads the sign-in page, unauthenticated `/api/dashboard` returns 401, Simon can sign in, unrelated users cannot, and data says Supabase. Check logout and session expiration.

Do not consider deployment finished until DNS, TLS, and a real authorized staff login are verified. No DNS change or public deployment has been made in this session.
