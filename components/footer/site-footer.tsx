import Link from "next/link";

const groups = [
  {
    title: "Marketplace",
    links: [
      { href: "/products", label: "Browse Templates" },
      { href: "/dashboard", label: "Seller Dashboard" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/support", label: "Support" },
      { href: "/library", label: "Library" },
      { href: "/downloads", label: "Downloads" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/auth?mode=signin", label: "Sign In" },
      { href: "/auth?mode=signup", label: "Create Account" },
      { href: "/cart", label: "Cart" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-white/90">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:px-8 lg:px-12">
        <section className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="text-sm font-semibold tracking-[0.2em] text-foreground">ANALITE</p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              Smart digital template marketplace with curated products, adaptive recommendations, and secure checkout-ready buyer journeys.
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{group.title}</p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} className="text-foreground/80 transition hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 flex flex-col gap-3 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright {year} Analite Store. All rights reserved.</p>
          <p>Built for responsive storefront experiences across mobile, tablet, and desktop.</p>
        </section>
      </div>
    </footer>
  );
}
