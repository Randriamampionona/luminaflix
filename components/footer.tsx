import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, Github } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "Navigation",
      links: ["Home", "Movies", "TV Shows", "Library", "New & Popular"],
    },
    {
      title: "Support",
      links: [
        "Help Center",
        "Terms of Use",
        "Privacy Provider",
        "Contact Us",
        "FAQ",
      ],
    },
    {
      title: "Premium",
      links: [
        "Lumina Plus",
        "Gift Cards",
        "Student Discount",
        "Corporate",
        "Ways to Watch",
      ],
    },
  ];

  return (
    <footer className="bg-zinc-950 border-t border-white/5 pt-24 pb-12 px-8 md:px-16">
      <div className="max-w-450 mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12 mb-20">
          {/* Brand Column */}
          <div className="col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                <span className="text-black font-black italic">L</span>
              </div>
              <span className="text-2xl font-black uppercase italic tracking-tighter text-white">
                Lumina<span className="text-cyan-500">Flix</span>
              </span>
            </Link>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed max-w-sm">
              The ultimate destination for cinema lovers. Experience
              high-definition storytelling and exclusive premieres in the
              world's most advanced library.
            </p>
            <div className="flex items-center gap-4">
              {[Facebook, Twitter, Instagram, Youtube, Github].map(
                (Icon, i) => (
                  <Link
                    key={i}
                    href="#"
                    className="p-2.5 rounded-full bg-zinc-900 border border-white/5 text-zinc-500 hover:text-cyan-500 hover:border-cyan-500/30 transition-all"
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* Link Columns */}
          {sections.map((section) => (
            <div key={section.title} className="space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                {section.title}
              </h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link}>
                    <Link
                      href="#"
                      className="text-zinc-500 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
              © {currentYear} LuminaFlix Media Inc.
            </p>
            <div className="hidden md:flex items-center gap-4">
              <span className="w-1 h-1 rounded-full bg-zinc-800" />
              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                Global Service
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.2em]">
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
