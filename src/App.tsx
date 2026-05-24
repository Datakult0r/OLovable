import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Building2, CheckCircle2, ChevronDown, Landmark, Mail, MapPin, Menu, Phone, Scale, ShieldCheck, X } from "lucide-react";
import rawPages from "./data/pages.generated.json";

type PageType = "home" | "contact" | "claim" | "faqs" | "company" | "listing" | "service-index" | "service" | "article" | "learn" | "policy" | "page";
type SiteImage = { src: string; alt: string };
type PageSection = { heading: string; level: number; paragraphs: string[] };
type PageData = { url: string; path: string; type: PageType; title: string; description: string; category: string; date: string; readTime: string; slug: string; images: SiteImage[]; sections: PageSection[] };
type LinkItem = readonly [string, string];
type NavGroup = { label: string; links: readonly LinkItem[] };

const pages = rawPages as PageData[];
const icons = [Scale, ShieldCheck, Building2, Landmark, BookOpen, CheckCircle2];
const navGroups: readonly NavGroup[] = [
  { label: "Legal Services", links: [["/services/consumer-claims", "Consumer Claims"], ["/services/individual-services", "Individuals"], ["/services/complex-360", "Complex 360"], ["/service/breach-of-contract", "Breach of Contract"], ["/service/data-breach", "Data Breach"], ["/service/purchase-scams", "Purchase Scams"]] },
  { label: "Company", links: [["/who", "Who We Are"], ["/why", "Why Choose Us"], ["/contact", "Contact"]] },
  { label: "Resources", links: [["/news", "News"], ["/learn", "Complex Academy"], ["/faqs", "FAQs"]] }
];

function norm(path: string) {
  if (!path || path === "/index.html") return "/";
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

function titleCase(value: string) {
  return value.replace(/[-/]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).trim();
}

function summary(page: PageData, max = 180) {
  const text = page.description || page.sections.flatMap((section) => section.paragraphs)[0] || "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function internal(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function useRoute() {
  const [path, setPath] = useState(() => norm(window.location.pathname));
  useEffect(() => {
    const onPop = () => setPath(norm(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (href: string) => {
    if (!internal(href)) return;
    const next = norm(href);
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path, navigate };
}

function useMotionReveal(routeKey: string) {
  useEffect(() => {
    const selector = [".section", ".page-hero", ".split-band", ".cta", ".content-card", ".content-flow section", ".form-section"].join(",");
    const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }
    targets.forEach((target, index) => {
      target.classList.add("motion-reveal");
      target.style.setProperty("--reveal-delay", `${Math.min(index * 45, 360)}ms`);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [routeKey]);
}

function TextLink({ href, children, className = "", onNavigate }: { href: string; children: React.ReactNode; className?: string; onNavigate: (href: string) => void }) {
  return <a className={className} href={href} onClick={(event) => { if (internal(href)) { event.preventDefault(); onNavigate(href); } }}>{children}</a>;
}

function ButtonLink({ href, children, variant = "primary", onNavigate }: { href: string; children: React.ReactNode; variant?: "primary" | "secondary" | "ghost"; onNavigate: (href: string) => void }) {
  return <TextLink href={href} onNavigate={onNavigate} className={`button ${variant}`}>{children}<ArrowRight size={18} /></TextLink>;
}

function Logo({ onNavigate }: { onNavigate: (href: string) => void }) {
  return <TextLink href="/" onNavigate={onNavigate} className="logo" aria-label="Complex Law home"><span className="logo-mark" /><span><strong>Complex</strong>Law</span></TextLink>;
}

function Header({ path, onNavigate }: { path: string; onNavigate: (href: string) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return <header className="site-header"><div className="header-inner"><Logo onNavigate={onNavigate} /><nav className={open ? "main-nav open" : "main-nav"} aria-label="Primary navigation">{navGroups.map((group) => <details className="nav-menu" key={group.label}><summary>{group.label}<ChevronDown size={14} /></summary><div className="nav-panel">{group.links.map(([href, label]) => <TextLink key={href} href={href} onNavigate={onNavigate} className={path === href ? "nav-link active" : "nav-link"}>{label}</TextLink>)}</div></details>)}<TextLink href="/pcp-claims" onNavigate={onNavigate} className="nav-link">PCP Claims</TextLink><TextLink href="/contact" onNavigate={onNavigate} className="nav-link">Contact</TextLink></nav><ButtonLink href="/claim" onNavigate={onNavigate} variant="secondary">Start your claim</ButtonLink><button className="icon-button" type="button" onClick={() => setOpen((value) => !value)}>{open ? <X /> : <Menu />}</button></div></header>;
}

function HeroArt({ page }: { page: PageData }) {
  return <div className="hero-art" aria-hidden="true">{page.images.slice(0, 6).map((image, index) => <img key={image.src} src={image.src} alt="" style={{ "--float-index": index } as React.CSSProperties} />)}</div>;
}

function Cards({ items, onNavigate, compact = false }: { items: PageData[]; onNavigate: (href: string) => void; compact?: boolean }) {
  return <div className={compact ? "card-grid compact" : "card-grid"}>{items.map((item, index) => { const Icon = icons[index % icons.length]; const image = item.images[0]; return <article className="content-card" key={item.path}>{image && !compact ? <img className="card-image" src={image.src} alt={image.alt || ""} /> : <Icon className="card-icon" />}<div className="card-body"><p className="kicker">{item.category || titleCase(item.type)}</p><h3>{item.title}</h3><p>{summary(item, 150)}</p><TextLink href={item.path} onNavigate={onNavigate} className="inline-link">Read more</TextLink></div></article>; })}</div>;
}

function Home({ page, onNavigate }: { page: PageData; onNavigate: (href: string) => void }) {
  const serviceIndexes = ["/services/consumer-claims", "/services/individual-services", "/services/complex-360"].map((p) => pages.find((candidate) => candidate.path === p)).filter(Boolean) as PageData[];
  const services = pages.filter((candidate) => candidate.type === "service").slice(0, 9);
  const articles = pages.filter((candidate) => candidate.type === "article").slice(0, 6);
  return <><section className="home-hero shell"><div className="hero-copy"><p className="eyebrow">Get the results that you deserve</p><h1>Making Complex Legal Issues <em>Simple</em></h1><p className="lead">{summary(page)}</p><div className="button-row"><ButtonLink href="/contact" onNavigate={onNavigate}>Speak to a solicitor</ButtonLink><ButtonLink href="/claim" onNavigate={onNavigate} variant="ghost">Start a claim online</ButtonLink></div></div><HeroArt page={page} /></section><section className="logo-strip shell">{page.images.filter((image) => image.alt).slice(0, 8).map((image) => <img key={image.src} src={image.src} alt={image.alt} />)}</section><section className="shell section"><div className="section-heading centered"><p className="eyebrow">Legal Services</p><h2>Legal services <em>tailored to your needs</em></h2><p>Consumer claims, individual disputes, and business support matched with the right legal team and strategy.</p></div><Cards items={serviceIndexes} onNavigate={onNavigate} compact /></section><section className="split-band shell"><div><p className="eyebrow">Our Promise</p><h2>The law is complex, but your case does not have to be</h2></div><p>We translate legal complexity into a clear strategy that helps you understand your options and stay in control.</p></section><section className="shell section"><div className="section-heading"><p className="eyebrow">Practice Areas</p><h2>Focused legal support</h2></div><Cards items={services} onNavigate={onNavigate} compact /></section><section className="section muted"><div className="shell"><div className="section-heading centered"><p className="eyebrow">Resources</p><h2>Plain-English updates and guides</h2></div><Cards items={articles} onNavigate={onNavigate} /></div></section><Cta onNavigate={onNavigate} /></>;
}

function PageHero({ page, onNavigate }: { page: PageData; onNavigate: (href: string) => void }) {
  const image = page.images[0];
  return <section className="page-hero shell"><div><p className="eyebrow">{page.category || titleCase(page.type)}</p><h1>{page.title}</h1><p className="lead">{summary(page)}</p><div className="meta-row">{page.date && <span>{page.date}</span>}{page.readTime && <span>{page.readTime}</span>}<span>{page.sections.length} sections</span></div><div className="button-row"><ButtonLink href="/contact" onNavigate={onNavigate}>Speak to a solicitor</ButtonLink><ButtonLink href="/claim" onNavigate={onNavigate} variant="ghost">Start claim</ButtonLink></div></div>{image && <div className="hero-media"><img src={image.src} alt={image.alt || page.title} /></div>}</section>;
}

function StandardPage({ page, onNavigate }: { page: PageData; onNavigate: (href: string) => void }) {
  const related = pages.filter((candidate) => candidate.path !== page.path && candidate.type === page.type).slice(0, 3);
  return <><PageHero page={page} onNavigate={onNavigate} /><section className="article shell"><aside>{page.sections.slice(0, 10).map((section) => <a key={section.heading} href={`#${section.heading.replace(/\W+/g, "-").toLowerCase()}`}>{section.heading}</a>)}</aside><div className="content-flow">{page.sections.map((section) => <section key={section.heading} id={section.heading.replace(/\W+/g, "-").toLowerCase()}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</div></section>{related.length > 0 && <section className="shell section"><div className="section-heading"><p className="eyebrow">Related</p><h2>Explore more</h2></div><Cards items={related} onNavigate={onNavigate} /></section>}<Cta onNavigate={onNavigate} /></>;
}

function Listing({ page, onNavigate }: { page: PageData; onNavigate: (href: string) => void }) {
  const collection = page.path.includes("learn") ? pages.filter((item) => item.type === "learn") : pages.filter((item) => item.type === "article");
  return <><PageHero page={page} onNavigate={onNavigate} /><section className="shell section"><div className="section-heading"><p className="eyebrow">{page.path.includes("learn") ? "Complex Academy" : "News"}</p><h2>{page.path.includes("learn") ? "Guides and explainers" : "Latest updates"}</h2></div><Cards items={collection} onNavigate={onNavigate} /></section></>;
}

function EditableForm({ kind }: { kind: "claim" | "contact" }) {
  return <form className="clone-form"><label>Name<input placeholder="Full name" /></label><label>Email<input type="email" placeholder="you@example.com" /></label>{kind === "claim" && <label>Claim type<select defaultValue=""><option value="" disabled>Select a claim type</option><option>Consumer claim</option><option>Property or tenancy dispute</option><option>Commercial dispute</option><option>Data breach</option></select></label>}<label>Message<textarea rows={6} placeholder="How can Complex Law help?" /></label><button type="button" className="button primary">Submit enquiry<ArrowRight size={18} /></button></form>;
}

function FormPage({ page, onNavigate }: { page: PageData; onNavigate: (href: string) => void }) {
  const isClaim = page.type === "claim";
  return <><PageHero page={page} onNavigate={onNavigate} /><section className="form-section shell"><div><p className="eyebrow">{isClaim ? "Start a claim" : "Contact"}</p><h2>{isClaim ? "Tell us what happened" : "Legal advice in plain English"}</h2><p>{summary(page)}</p><div className="contact-pills"><span><Mail size={16} /> Email enquiry</span><span><Phone size={16} /> Phone support</span><span><MapPin size={16} /> Liverpool office</span></div></div><EditableForm kind={isClaim ? "claim" : "contact"} /></section></>;
}

function Cta({ onNavigate }: { onNavigate: (href: string) => void }) {
  return <section className="cta shell"><div><p className="eyebrow">Ready to move from guesswork to clarity?</p><h2>Get clear legal support for the road ahead.</h2></div><div className="button-row"><ButtonLink href="/contact" onNavigate={onNavigate}>Speak to a solicitor</ButtonLink><ButtonLink href="/claim" onNavigate={onNavigate} variant="secondary">Start a claim online</ButtonLink></div></section>;
}

function Footer({ onNavigate }: { onNavigate: (href: string) => void }) {
  return <footer><div className="footer-top"><div><Logo onNavigate={onNavigate} /><p>Complex Law specialises in consumer protection, property and tenancy law, fraud, scams, commercial disputes, and litigation.</p></div><div><h3>Legal Solutions</h3><TextLink href="/services/consumer-claims" onNavigate={onNavigate}>Consumer Claims</TextLink><TextLink href="/services/individual-services" onNavigate={onNavigate}>Individuals</TextLink><TextLink href="/services/complex-360" onNavigate={onNavigate}>Complex 360</TextLink></div><div><h3>Company</h3><TextLink href="/news" onNavigate={onNavigate}>News</TextLink><TextLink href="/faqs" onNavigate={onNavigate}>FAQs</TextLink><TextLink href="/who" onNavigate={onNavigate}>Who We Are</TextLink></div><div><h3>Policies</h3><TextLink href="/policy/complaints-procedure" onNavigate={onNavigate}>Complaints</TextLink><TextLink href="/policy/privacy-cookies" onNavigate={onNavigate}>Privacy</TextLink></div></div><div className="footer-bottom">© 2026 ComplexLaw clone. Editable React implementation.</div></footer>;
}

export default function App() {
  const { path, navigate } = useRoute();
  const pageMap = useMemo(() => new Map(pages.map((page) => [norm(page.path), page])), []);
  const page = pageMap.get(path);
  useMotionReveal(path);
  useEffect(() => { document.title = page ? `${page.title} | Complex Law` : "Complex Law"; }, [page]);
  return <div><Header path={path} onNavigate={navigate} /><main>{!page ? <section className="page-hero shell"><div><p className="eyebrow">404</p><h1>Page not found</h1><p className="lead">This route is not part of the crawled sitemap.</p><ButtonLink href="/" onNavigate={navigate}>Back home</ButtonLink></div></section> : page.type === "home" ? <Home page={page} onNavigate={navigate} /> : page.type === "listing" ? <Listing page={page} onNavigate={navigate} /> : page.type === "claim" || page.type === "contact" ? <FormPage page={page} onNavigate={navigate} /> : <StandardPage page={page} onNavigate={navigate} />}</main><Footer onNavigate={navigate} /></div>;
}
