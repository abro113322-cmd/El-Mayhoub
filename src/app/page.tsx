import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import DashboardPreview from "@/components/DashboardPreview";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <DashboardPreview />
      <Footer />
    </>
  );
}