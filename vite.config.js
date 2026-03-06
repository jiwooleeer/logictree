import tailwindcss from '@tailwindcss/vite';

export default {
  plugins: [tailwindcss()],
  server: {
    open: true,
    host: true,
  },
};
