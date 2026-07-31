import { Metadata } from "next";
import { pagesConfig } from "@/config/pages";
import { WhatsAppBridge } from "@/components/WhatsAppBridge";

const config = pagesConfig.page1;

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
};

export default function Home() {
  return <WhatsAppBridge config={config} />;
}
