"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { ProfileCustomizer } from "./ProfileCustomizer";

interface EditProfileButtonProps {
  profile: any;
  teams: any[];
}

export function EditProfileButton({ profile, teams }: EditProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="v-btn-secondary py-2 px-4 flex items-center gap-2 text-[10px] hover:text-v-white transition-all group"
      >
        <Settings2 className="w-3 h-3 group-hover:rotate-90 transition-transform duration-300" /> 
        AJUSTES DE PERFIL
      </button>

      {isOpen && (
        <ProfileCustomizer 
          profile={profile} 
          teams={teams} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </>
  );
}
