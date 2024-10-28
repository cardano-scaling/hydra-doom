import React, { useState, useEffect, useRef } from "react";
import { IoMdVolumeHigh, IoMdVolumeOff } from "react-icons/io";

import song1 from "../../assets/music/blue-screen-of-death.mp3";
import song2 from "../../assets/music/demons-prowl.mp3";
import song3 from "../../assets/music/dooms-fate.mp3";
import song4 from "../../assets/music/mark-of-malice.mp3";
import song5 from "../../assets/music/unnamed.mp3";

const files = [song1, song2, song3, song4, song5];

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioIndexRef = useRef<number>(currentIndex);

  useEffect(() => {
    const handleEnded = () => {
      // Advance to the next song, wrapping around to create an infinite loop
      setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
    };

    let currentAudio = audioRef.current;

    if (!currentAudio) {
      // No audio object yet, create one
      currentAudio = new Audio(files[currentIndex]);
      currentAudio.volume = 0.2;
      currentAudio.onerror = (e) => {
        console.error("Audio playback error:", e);
        handleEnded();
      };
      currentAudio.addEventListener("ended", handleEnded);

      audioRef.current = currentAudio;
      currentAudioIndexRef.current = currentIndex;
    } else if (currentAudioIndexRef.current !== currentIndex) {
      // Song changed, create new Audio object
      currentAudio.pause();
      currentAudio.removeEventListener("ended", handleEnded);

      currentAudio = new Audio(files[currentIndex]);
      currentAudio.volume = 0.2;
      currentAudio.onerror = (e) => {
        console.error("Audio playback error:", e);
        handleEnded();
      };
      currentAudio.addEventListener("ended", handleEnded);

      audioRef.current = currentAudio;
      currentAudioIndexRef.current = currentIndex;

      // If the player is supposed to be playing, start the new track
      if (isPlaying) {
        currentAudio.play();
      }
    }

    if (isPlaying) {
      if (currentAudio.paused) {
        currentAudio.play();
      }
    } else {
      currentAudio.pause();
    }

    return () => {
      // Cleanup when component unmounts
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.removeEventListener("ended", handleEnded);
      }
    };
  }, [isPlaying, currentIndex]);

  // Automatically play the music when the component mounts
  useEffect(() => {
    setIsPlaying(true);
  }, []);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <button
      className="absolute top-16 right-56 text-white"
      onClick={togglePlay}
    >
      {isPlaying ? <IoMdVolumeHigh size={28} /> : <IoMdVolumeOff size={28} />}
    </button>
  );
};

export default MusicPlayer;
