(async () => {
  const editor = document.querySelector('.cm-content');
  if (editor) {
    // For CodeMirror 6 (new GitHub editor)
    // We might need to dispatch an event or use the CM API if available
    // But setting textContent or innerHTML might not work.
    // Try to focus and then use document.execCommand if possible, or just set innerText.
    editor.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAMA | Networked Autonomous Marketplace Architecture",
  description: "AI-native travel operating system for DMCs and agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased text-left">
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">{children}</body>
    </html>
  );
}
`);
    return "Inserted via execCommand";
  } else {
    const textarea = document.querySelector('textarea[name="value"]');
    if (textarea) {
      textarea.value = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAMA | Networked Autonomous Marketplace Architecture",
  description: "AI-native travel operating system for DMCs and agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased text-left">
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">{children}</body>
    </html>
  );
}
`;
      return "Inserted via textarea";
    }
  }
  return "Editor not found";
})()
