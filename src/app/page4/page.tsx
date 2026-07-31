import { Metadata } from "next";
import { pagesConfig } from "@/config/pages";
import { WhatsAppBridge } from "@/components/WhatsAppBridge";

const config = pagesConfig.page4;

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  openGraph: {
    title: config.title,
    description: config.description,
  },
};

export default function Page4() {
  return <WhatsAppBridge config={config} />;
}
