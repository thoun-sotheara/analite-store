const authConfig = {
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt" as const,
  },
};

export default authConfig;
