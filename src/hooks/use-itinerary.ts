"use client";

import { useState, useCallback } from "react";

export type TravelBlock = {
  id: string;
  type: "transfer" | "accommodation" | "activity";
  title: string;
  time: string;
  location: string;
  price: string;
  description: string;
  tags?: string[];
  icon: string;
  color: string;
  image?: string;
};

export type Day = {
  id: number;
  title: string;
  description: string;
  blocks: TravelBlock[];
};

export type Itinerary = {
  client: string;
  destination: string;
  dates: string;
  days: Day[];
};

const initialItinerary: Itinerary = {
  client: "Anjali Sharma",
  destination: "Dubai, UAE",
  dates: "15-20 Oct 2024",
  days: [
    { 
      id: 1, 
      title: "Arrival & Check-in", 
      description: "Welcome to Dubai! Your first day is designed for comfort and luxury after your flight.",
      blocks: [
        {
          id: "b1",
          type: "transfer",
          title: "Private Luxury Cab to Hotel",
          time: "14:30 - 15:15",
          location: "Dubai Intl. Airport (DXB)",
          price: "$45.00",
          description: "Meet & Greet service with a professional driver holding a placard at the arrival hall.",
          icon: "Car",
          color: "bg-cyan-100 text-cyan-700"
        },
        {
          id: "b2",
          type: "accommodation",
          title: "Atlantis, The Palm",
          time: "Check-in 15:00",
          location: "Palm Jumeirah, Dubai",
          price: "$850.00/night",
          description: "Confirmed reservation for 5 nights. Check-in priority enabled. Ocean View room guaranteed.",
          tags: ["All-Inclusive", "Free Wi-Fi"],
          icon: "Hotel",
          color: "bg-blue-100 text-blue-700",
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=400"
        },
        {
          id: "b3",
          type: "activity",
          title: "Burj Khalifa Observation Deck",
          time: "18:30 - 20:00",
          location: "Downtown Dubai",
          price: "$120.00",
          description: "Sunset visit to 'At the Top' levels 124 & 125. Breathtaking 360-degree views.",
          tags: ["Fast-Track Entry"],
          icon: "Compass",
          color: "bg-emerald-100 text-emerald-700",
          image: "https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?auto=format&fit=crop&q=80&w=400"
        }
      ]
    },
    { id: 2, title: "Downtown Exploration", description: "Experience the heart of Dubai with visits to the Burj Khalifa and Dubai Mall.", blocks: [] },
    { id: 3, title: "Desert Adventure", description: "A thrilling afternoon in the sand dunes followed by a traditional dinner.", blocks: [] },
    { id: 4, title: "Old Dubai & Souks", description: "Discover the heritage of Dubai in the Al Fahidi district and spice markets.", blocks: [] },
    { id: 5, title: "Leisure & Shopping", description: "Final day for relaxation and last-minute luxury shopping.", blocks: [] },
  ]
};

export function useItinerary() {
  const [itinerary, setItinerary] = useState<Itinerary>(initialItinerary);

  const addDay = useCallback(() => {
    setItinerary(prev => ({
      ...prev,
      days: [
        ...prev.days,
        {
          id: prev.days.length + 1,
          title: "New Day",
          description: "Plan your day's activities here.",
          blocks: []
        }
      ]
    }));
  }, []);

  const updateDay = useCallback((dayId: number, data: Partial<Day>) => {
    setItinerary(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === dayId ? { ...d, ...data } : d)
    }));
  }, []);

  const addBlock = useCallback((dayId: number, block: TravelBlock) => {
    setItinerary(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === dayId ? { ...d, blocks: [...d.blocks, block] } : d)
    }));
  }, []);

  const removeBlock = useCallback((dayId: number, blockId: string) => {
    setItinerary(prev => ({
      ...prev,
      days: prev.days.map(d => d.id === dayId ? { ...d, blocks: d.blocks.filter(b => b.id !== blockId) } : d)
    }));
  }, []);

  return {
    itinerary,
    addDay,
    updateDay,
    addBlock,
    removeBlock
  };
}
