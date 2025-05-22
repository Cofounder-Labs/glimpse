import React from "react";
import { FileText, Users, Settings, ShoppingCart } from "lucide-react";
import { ActionButton } from "./ActionButton";

export const SuggestedActions: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-3 mb-16">
    <ActionButton icon={<FileText className="w-4 h-4" />} label="A demo of my new Docs" />
    <ActionButton icon={<Users className="w-4 h-4" />} label="Onboarding flow walkthrough" />
    <ActionButton icon={<Settings className="w-4 h-4" />} label="Admin panel in action" />
    <ActionButton icon={<ShoppingCart className="w-4 h-4" />} label="Self-serve checkout flow" />
  </div>
); 