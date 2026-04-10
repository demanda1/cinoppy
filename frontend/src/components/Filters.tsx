import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Filters() {

    const navigate = useNavigate();

    const languageOptions = [
        { label: 'Hindi', value: 'hi' },
        { label: 'English', value: 'en' },
        { label: 'Bengali', value: 'bn' },
        { label: 'Oriya', value: 'or' },
        { label: 'Marathi', value: 'mr' },
        { label: 'Malayalam', value: 'ml' },
        { label: 'Tamil', value: 'ta' },
        { label: 'Telugu', value: 'te' },
        { label: 'Kannada', value: 'kn' },
        { label: 'Urdu', value: 'ur' },
        { label: 'Punjabi', value: 'pa' },
        { label: 'Assamese', value: 'as' },
        { label: 'Gujarati', value: 'gu' },
        { label: 'Japanese', value: 'ja' },
        { label: 'Korean', value: 'ko' },
        { label: 'German', value: 'de' },
        { label: 'French', value: 'fr' },
        { label: 'Spanish', value: 'es' },
        { label: 'Mandarin', value: 'zh' },
        { label: 'Italian', value: 'it' },
        { label: 'Russian', value: 'ru' },
        { label: 'Nepali', value: 'ne' },
        { label: 'Turkish', value: 'tr' },
        { label: 'Thai', value: 'th' }
      ];
      
      const typeOptions = [
        { label: 'Movie', value: 'movie' },
        { label: 'TV Series', value: 'tv' }
      ];

      const genreOptions = [
        { label: 'Action', value: '28' },
        { label: 'Adventure', value: '12' },
        { label: 'Animation', value: '16' },
        { label: 'Comedy', value: '35' },
        { label: 'Crime', value: '80' },
        { label: 'Documentary', value: '99' },
        { label: 'Drame', value: '18' },
        { label: 'Family', value: '10751' },
        { label: 'Fantasy', value: '14' },
        { label: 'History', value: '36' },
        { label: 'Horror', value: '27' },
        { label: 'Music', value: '10402' },
        { label: 'Mystery', value: '9648' },
        { label: 'Romantic', value: '10749' },
        { label: 'Science Fiction', value: '878' },
        { label: 'Thriller', value: '53' },
        { label: 'War', value: '10752' }
      ]

      const ratingOptions = [
        { label: '9 and above', value: '9' },
        { label: '8 and above', value: '8' },
        { label: '7 and above', value: '7' },
        { label: '6 and above', value: '6' },
        { label: '5 and above', value: '5' },
        { label: 'below 5', value: '4' }
      ]

  const [filters, setFilters] = useState({
    language: '',
    type: 'movie',
    genre: '',
    rating: ''
  });

  async function handleFilterSearch() {
    // Basic validation: Don't search if everything is empty
      console.log("🚀 Capturing filters:", filters);
      navigate(`/filter?language=${encodeURIComponent(filters.language)}&type=${encodeURIComponent(filters.type)}&genre=${encodeURIComponent(filters.genre)}&rating=${encodeURIComponent(filters.rating)}`);
      setFilters({
        language: '',
        type: 'movie',
        genre: '',
        rating: ''
      });
      
  }


  return (
    <div>
        <div className=" space-y-4  p-2 ">
        {/* <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gradient">
          Cinoppy
        </h1> */}
        
        <p className="text-sm text-muted-foreground  leading-relaxed">
          Language: &nbsp;
          <FilterDropdown 
          placeholder="Select Language"
        value={filters.language} 
        options={languageOptions}
        onSelect={(val) => setFilters({...filters, language: val})} 
      />
        </p> 

        <p className="text-sm text-muted-foreground  leading-relaxed">
        &nbsp; Type: &nbsp;
      <FilterDropdown 
        placeholder="Select type"
        value={filters.type} 
        options={typeOptions}
        onSelect={(val) => setFilters({...filters, type: val})} 
      />
      </p>
 
   
      <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
      &nbsp; Genre: &nbsp;
      <FilterDropdown 
      placeholder="Type genre"
        value={filters.genre} 
        options={genreOptions} 
        onSelect={(val) => setFilters({...filters, genre: val})} 
      />
      </p>

      <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
      &nbsp; Rating: &nbsp;
    <FilterDropdown 
        placeholder="Select rating"
        value={filters.rating} 
        options={ratingOptions} 
        onSelect={(val) => setFilters({...filters, rating: val})} 
      />
      </p>

    <div className="flex justify-center gap-2 pt-2">
    <Button
            type="button"
            size="lg"
            onClick={() => handleFilterSearch()}
            className="bg-gradient-to-r from-cinoppy-purple to-cinoppy-pink hover:from-cinoppy-purple/80 hover:to-cinoppy-pink/80 text-white gap-1"
          >
            Find something like that
      </Button>
    </div>
    </div>
    </div>
    
  );
}
interface Option {
    label: string;
    value: string;
  }

function FilterDropdown({ placeholder, value, options, onSelect }: { 
    placeholder: string, 
    value: string, 
    options: Option[], 
    onSelect: (v: string) => void 
  }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find the label that matches the current value to show on the button
  const selectedOption = options.find(opt => opt.value === value);
  
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
  
    return (
      <div className="relative inline-block " ref={dropdownRef}>
        {/* Trigger: Small, Glassy Pill */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`px-3 py-1 rounded-full border transition-all duration-300 text-xs
            ${isOpen 
              ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
              : 'bg-white/5 border-white/10 text-[#e8e8ed] hover:bg-white/10'}`}
        >
          {/* Show the LABEL if selected, otherwise the placeholder */}
        {selectedOption ? selectedOption.label : placeholder}
        </button>
  
        {/* Menu: Compact Glassmorphism */}
        {isOpen && (
          <div className="absolute max-h-48 overflow-y-auto no-scrollbar left-0 top-full mt-2 z-[100] min-w-[140px] bg-[#0a0a0f]/80 border border-white/10 rounded-[0.75rem] shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors --color-muted
                    ${value === option.value 
                      ? 'text-[#a855f7]' 
                      : 'text-[#8888a0] hover:text-[#e8e8ed] hover:bg-white/5'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
}