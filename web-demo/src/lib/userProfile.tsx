"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type AvatarType = "photo" | "digital" | "none";

export interface UserProfile {
  avatarType: AvatarType;
  digitalAvatarId: number | null;
  photoCount: number;
  skinTone: string;
  bodyType: string;
  style: string;
  gender: string;
  uploadedPhotos: string[];
  generatedAvatarUrl: string | null;
}

const defaultProfile: UserProfile = {
  avatarType: "none",
  digitalAvatarId: null,
  photoCount: 0,
  skinTone: "未知",
  bodyType: "未知",
  style: "未知",
  gender: "未知",
  uploadedPhotos: [],
  generatedAvatarUrl: null,
};

interface UserProfileContextType {
  profile: UserProfile;
  setPhotoProfile: (photos: string[]) => void;
  setDigitalAvatarProfile: (photos: string[], avatarUrl?: string) => void;
  setGeneratedAvatar: (url: string) => void;
  getProfileSummary: () => string;
  getPersonImage: () => string | null;
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: defaultProfile,
  setPhotoProfile: () => {},
  setDigitalAvatarProfile: () => {},
  setGeneratedAvatar: () => {},
  getProfileSummary: () => "",
  getPersonImage: () => null,
});

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const setPhotoProfile = (photos: string[]) => {
    setProfile({
      avatarType: "photo",
      digitalAvatarId: null,
      photoCount: photos.length,
      skinTone: "根据照片分析中...",
      bodyType: "根据照片分析中...",
      style: "待分析",
      gender: "待分析",
      uploadedPhotos: photos,
      generatedAvatarUrl: null,
    });
  };

  const setDigitalAvatarProfile = (photos: string[], avatarUrl?: string) => {
    setProfile({
      avatarType: "digital",
      digitalAvatarId: null,
      photoCount: photos.length,
      skinTone: "根据照片分析中...",
      bodyType: "根据照片分析中...",
      style: "待分析",
      gender: "待分析",
      uploadedPhotos: photos,
      generatedAvatarUrl: avatarUrl || null,
    });
  };

  const setGeneratedAvatar = (url: string) => {
    setProfile((prev) => ({ ...prev, generatedAvatarUrl: url }));
  };

  const getProfileSummary = () => {
    if (profile.avatarType === "none") return "";
    const avatarLabel = profile.avatarType === "photo" ? "真人照片" : "数字分身";
    return `${avatarLabel} · ${profile.skinTone} · ${profile.bodyType} · ${profile.gender}`;
  };

  const getPersonImage = (): string | null => {
    if (profile.avatarType === "digital" && profile.generatedAvatarUrl) {
      return profile.generatedAvatarUrl;
    }
    if (profile.uploadedPhotos.length > 0) {
      return profile.uploadedPhotos[0];
    }
    return null;
  };

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        setPhotoProfile,
        setDigitalAvatarProfile,
        setGeneratedAvatar,
        getProfileSummary,
        getPersonImage,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
