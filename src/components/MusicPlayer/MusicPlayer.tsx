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

  useEffect(() => {
    const currentAudio = audioRef.current;

    if (!currentAudio) {
      const newAudio = new Audio(files[currentIndex]);
      newAudio.volume = 0.2;

      newAudio.addEventListener("ended", () => {
        // Advance to the next song and loop back to the start
        setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
      });

      audioRef.current = newAudio;
    } else {
      // Load new audio when index changes
      currentAudio.src = files[currentIndex];
      currentAudio.load();

      if (isPlaying) {
        currentAudio.play();
      }
    }

    return () => {
      // Cleanup event listener on unmount
      currentAudio?.pause();
      currentAudio?.removeEventListener("ended", () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % files.length);
      });
    };
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    const currentAudio = audioRef.current;

    if (currentAudio) {
      if (isPlaying) {
        currentAudio.play();
      } else {
        currentAudio.pause();
      }
    }
  }, [isPlaying]);

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
