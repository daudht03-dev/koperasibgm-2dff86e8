import { useState } from "react";
import { Button } from "./button";
import { Menu, X, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { useCompanyProfile } from "@/hooks/use-company-profile";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { profile } = useCompanyProfile();

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/admin" className="flex items-center space-x-2">
              <div className="bg-gradient-organic p-2 rounded-lg shadow-gentle">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <Button asChild variant="default" className="bg-gradient-organic shadow-organic">
              <Link to="/admin">Admin Dashboard</Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border/50">
              <div className="px-3 py-2">
                <Button asChild variant="default" className="w-full bg-gradient-organic shadow-organic">
                  <Link to="/admin">Admin Dashboard</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;