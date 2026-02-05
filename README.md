This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)..

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.




How to control the banner via ENV
Local (PowerShell)

Show banner for this run only

$env:NEXT_PUBLIC_SHOW_TEMP_BANNER="1"; npm run dev


Hide banner for this run

$env:NEXT_PUBLIC_SHOW_TEMP_BANNER="0"; npm run dev


Remove the var from the current shell (optional cleanup)

Remove-Item Env:NEXT_PUBLIC_SHOW_TEMP_BANNER -ErrorAction SilentlyContinue


Make it persistent across terminal sessions (requires new terminal)

# Turn ON persistently
setx NEXT_PUBLIC_SHOW_TEMP_BANNER "1"
# Turn OFF persistently
setx NEXT_PUBLIC_SHOW_TEMP_BANNER "0"


Note: setx doesn’t affect the current shell; open a new terminal or restart the dev server.

Vercel (Preview/Production)

Project → Settings → Environment Variables

Add:

Name: NEXT_PUBLIC_SHOW_TEMP_BANNER

Value: 1 (show) or 0 (hide)

Environment: check Preview and/or Production

Save, then trigger a redeploy (push a commit or click Redeploy on the latest deployment).

That’s it. If you want, I can also drop a short note into your repo’s README with these exact steps next time.
