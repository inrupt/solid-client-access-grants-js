# Web application project template for Inrupt projects

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First install, then run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. To change the
port from the default of 3000, use the `-p` option on the `dev` script in your `package.json`, for
example to change our app to use port 3001 instead:

```json
{
  "scripts": {
    "dev": "next dev -p 3001",
    :
  },
  :
}
```

## Solid Pod login

Note that the login button in this demo is hard-coded to use the Solid Identity broker at
`https://broker.pod.inrupt.com`. To change this, look at `components/header/index.jsx`.

## Updating your demo

You can start editing the demo by modifying `pages/index.jsx`. The page auto-updates as you edit the file.

You should also update values in `config.js` and `package.json` to match your demo.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

To learn more about Inrupt client libraries, visit [docs.inrupt.com](https://docs.inrupt.com/).
