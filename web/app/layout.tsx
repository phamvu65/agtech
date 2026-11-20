import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "AGTECH · Theo dõi thị trường", description: "Thông tin thị trường nông sản cho hợp tác xã" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
