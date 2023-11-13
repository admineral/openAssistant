/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  redirects: async () => {
    return [
      {
        source: "/github",
        destination: "https://github.com/admineral",
        permanent: true,
      },
      {
        source: "/deploy",
        destination: "https://vercel.com",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
