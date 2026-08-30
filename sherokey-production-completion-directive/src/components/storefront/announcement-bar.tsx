import Link from "next/link";

export function AnnouncementBar({ text, link }: { text: string; link?: string | null }) {
  const content = (
    <p className="mx-auto max-w-7xl px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">{text}</p>
  );
  return (
    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">
      {link ? (
        <Link href={link} className="block hover:opacity-90">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
