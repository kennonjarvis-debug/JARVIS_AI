"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Business {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  planTier: string;
  subscriptionStatus?: string;
  owner: {
    id: string;
    name?: string;
    email: string;
  };
  _count?: {
    members: number;
  };
}

interface BusinessSwitcherProps {
  currentBusinessSlug?: string;
}

export default function BusinessSwitcher({ currentBusinessSlug }: BusinessSwitcherProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch businesses on mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const fetchBusinesses = async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = await response.json();

      if (data.success) {
        setBusinesses(data.businesses);
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentBusiness = businesses.find((b) => b.slug === currentBusinessSlug);

  const handleBusinessSelect = (slug: string) => {
    setIsOpen(false);
    router.push(`/observatory/${slug}`);
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push("/onboarding/business");
  };

  if (loading) {
    return (
      <div style={{
        padding: "12px 16px",
        background: "#f9fafb",
        borderRadius: 8,
        color: "#6b7280",
        fontSize: 14,
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Current Business Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: isOpen ? "#f9fafb" : "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.background = "#f9fafb";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.background = "#fff";
        }}
      >
        {/* Business Logo/Icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: currentBusiness?.logo
            ? `url(${currentBusiness.logo})`
            : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          color: "#fff",
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {!currentBusiness?.logo && (currentBusiness?.name?.[0]?.toUpperCase() || "?")}
        </div>

        {/* Business Info */}
        <div style={{
          flex: 1,
          textAlign: "left",
          overflow: "hidden",
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {currentBusiness?.name || "Select Business"}
          </div>
          <div style={{
            fontSize: 12,
            color: "#6b7280",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {currentBusiness?.planTier || "No business selected"}
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          style={{
            width: 16,
            height: 16,
            color: "#6b7280",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          zIndex: 1000,
          maxHeight: 400,
          overflowY: "auto",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              Your Businesses ({businesses.length})
            </div>
          </div>

          {/* Business List */}
          <div style={{ padding: "8px 0" }}>
            {businesses.map((business) => (
              <button
                key={business.id}
                onClick={() => handleBusinessSelect(business.slug)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: business.slug === currentBusinessSlug ? "#fef2f2" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  outline: "none",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (business.slug !== currentBusinessSlug) {
                    e.currentTarget.style.background = "#f9fafb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (business.slug !== currentBusinessSlug) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {/* Business Logo */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: business.logo
                    ? `url(${business.logo})`
                    : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  color: "#fff",
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {!business.logo && business.name[0].toUpperCase()}
                </div>

                {/* Business Info */}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {business.name}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: "#6b7280",
                  }}>
                    {business._count?.members} member{business._count?.members !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Current Indicator */}
                {business.slug === currentBusinessSlug && (
                  <svg
                    style={{
                      width: 16,
                      height: 16,
                      color: "#ef4444",
                    }}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Create New Business Button */}
          <div style={{
            borderTop: "1px solid #e5e7eb",
            padding: "8px",
          }}>
            <button
              onClick={handleCreateNew}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: "#fff",
                fontWeight: 600,
              }}>
                +
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#111827",
              }}>
                Create New Business
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
