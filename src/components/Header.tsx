import React from "react";

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#F5E6DA] py-6 px-6 md:px-12 flex justify-center items-center">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-[0.3em] text-[#8B5E3C]">
          ALTOV
        </span>
        <span className="text-2xl font-light tracking-[0.3em] text-[#8B5E3C]">
          BEAUTY
        </span>
      </div>
    </header>
  );
};

export default Header;
