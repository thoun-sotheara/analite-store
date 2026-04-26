const authConfig = {
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt" as const,
  },
};

export default authConfig;
