export interface PageConfig {
  id: string;
  title: string;
  description: string;
  logo: string;
  logoAlt: string;
  whatsappNumber: string;
  whatsappMessage: string;
  headingText?: string;
  subheadingText?: string;
  buttonText?: string;
  metaPixelId?: string;
  mediaType?: "image" | "gif" | "video";
  mediaWidth?: number;
  mediaHeight?: number;
}

export const defaultContent = {
  headingText: "Thank you for your interest.",
  subheadingText: "Click below to continue your conversation on WhatsApp.",
  buttonText: "Continue to WhatsApp",
  metaPixelId: "",
  mediaType: "image" as const,
  mediaWidth: 180,
  mediaHeight: 80,
};

export const pagesConfig: Record<string, PageConfig> = {
  page1: {
    id: "page1",
    title: "Connect on WhatsApp - Campaign 1",
    description: "Continue your conversation with our team directly on WhatsApp.",
    logo: "/logos/logo1.png",
    logoAlt: "Goldy Anna Logo",
    whatsappNumber: "15551234567",
    whatsappMessage: "Hello! I saw your ad on Facebook and would like to get more information about Product A.",
    ...defaultContent,
    headingText: "Hello I Want ID",
    subheadingText: "Click below to continue your conversation on WhatsApp and get ID",
    buttonText: "WhatsApp Now",
  },
  page2: {
    id: "page2",
    title: "Connect on WhatsApp - Campaign 2",
    description: "Continue your conversation with our team directly on WhatsApp.",
    logo: "/logos/logo2.png",
    logoAlt: "Nexus Global Logo",
    whatsappNumber: "15559876543",
    whatsappMessage: "Hi there! I am interested in Special Offer B mentioned in your Meta campaign.",
    ...defaultContent,
  },
  page3: {
    id: "page3",
    title: "Connect on WhatsApp - Campaign 3",
    description: "Continue your conversation with our team directly on WhatsApp.",
    logo: "/logos/logo3.png",
    logoAlt: "Prism Solutions Logo",
    whatsappNumber: "18005550199",
    whatsappMessage: "Hello! I would like to schedule a consultation regarding your services.",
    ...defaultContent,
  },
  page4: {
    id: "page4",
    title: "Connect on WhatsApp - Campaign 4",
    description: "Continue your conversation with our team directly on WhatsApp.",
    logo: "/logos/logo4.png",
    logoAlt: "Horizon Labs Logo",
    whatsappNumber: "18885550144",
    whatsappMessage: "Hi! Please connect me with an advisor to discuss VIP membership options.",
    ...defaultContent,
  },
};
