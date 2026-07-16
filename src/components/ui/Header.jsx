import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Icon from "../AppIcon";
import Button from "./Button";

import { fetchNotifications } from "services/notification.service";
import NotificationDropdown from "components/NotificationDropdown";
import { useNotification } from "NotificationContext";
import { useNotificationCount } from "hooks/useNotificationCount";
import Avatar from "react-avatar";
import { useQueryClient } from "@tanstack/react-query";
const Header = ({ onMenuToggle, isSidebarOpen = false }) => {
  // `login_object` may be missing (fresh tab, mid-logout race) or
  // malformed (manual clear). Default to an empty object so the
  // unguarded `(LogInuser.username || "User")` reads below return undefined
  // instead of throwing and crashing the whole authenticated layout.
  // try/catch covers the malformed-JSON case where the bare
  // `JSON.parse` would throw a SyntaxError.
  const LogInuserstr = localStorage.getItem("login_object");
  let LogInuser = {};
  try {
    LogInuser = LogInuserstr ? JSON.parse(LogInuserstr) || {} : {};
  } catch {
    LogInuser = {};
  }

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleUserDropdownToggle = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
    setIsHelpDropdownOpen(false);
  };

  const handleHelpDropdownToggle = () => {
    setIsHelpDropdownOpen(!isHelpDropdownOpen);
    setIsUserDropdownOpen(false);
  };

  const handleDropdownClose = () => {
    setIsUserDropdownOpen(false);
    setIsHelpDropdownOpen(false);
  };

  const handleLogout = () => {
    // Clear react-query cache
    queryClient.clear();

    // Explicit removes instead of `localStorage.clear()`. Wiping
    // everything also nuked unrelated keys: the
    // `followup_fired_*` dedupe set (so the same followup
    // reminders re-fire on next login), theme/sidebar prefs, and
    // any persisted React Query cache. List the auth-related keys
    // explicitly so additions don't accidentally clobber unrelated
    // state.
    [
      "auth_token",
      "login_object",
      "acl",
      "isAuthenticated",
    ].forEach((k) => localStorage.removeItem(k));

    // Also flush any per-user count caches set by leads.service.js
    // (key shape: `leads_count_cache_<userId>`). Even though the cache
    // is namespaced per user now, leaving previous-session entries
    // around just bloats localStorage and could resurrect stale data
    // if the same user logs in again within the TTL.
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("leads_count_cache_")) localStorage.removeItem(k);
    });

    handleDropdownClose();
    navigate("/login", { replace: true });
  };

  const handleProfileClick = () => {
    // Navigate to profile
    console.log("Profile clicked");
    navigate("/profile");
    handleDropdownClose();
  };

  const handleSettingsClick = () => {
    // Navigate to settings
    console.log("Settings clicked");
    handleDropdownClose();
  };
  const { open, setOpen, setNotifications } = useNotification();
  const notificationRef = useRef(null);

  // Close the notification dropdown when clicking anywhere outside the bell + dropdown area.
  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, setOpen]);

  // Shake the bell whenever there are unread notifications (count > 0): once on
  // load, again with sound on each new arrival, and as a periodic reminder. It
  // goes quiet only when the unread count reaches 0. `prevCountRef` starts null
  // so we can tell the very first server value apart from a live increase.
  const prevCountRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [bellRinging, setBellRinging] = useState(false);
  // Holds the current shake's stop-timer so overlapping triggers don't leave
  // the bell stuck ringing.
  const ringTimerRef = useRef(null);
  // Latest count, mirrored into a ref so the 30-min reminder interval (which is
  // set up once) reads the current value instead of a stale closure.
  const countRef = useRef(0);

  // Shake the bell once (auto-stops after the 900ms animation). `withSound`
  // plays the chime — on for genuine new arrivals, off for the quieter 30-min
  // reminder.
  const triggerRing = (withSound) => {
    setBellRinging(true);
    if (withSound) playChime();
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = setTimeout(() => setBellRinging(false), 900);
  };

  const handleClick = async () => {
    setOpen(!open);

    // fetch only when opening
    if (!open) {
      const data = await fetchNotifications();
      setNotifications(data.list || []);
    }
  };
  const { data } = useNotificationCount(!open);
  const count = data || 0;

  // Short two-tone chime generated with the Web Audio API so we don't ship an
  // audio asset. Browsers block audio until the user has interacted with the
  // page; by then they've navigated/clicked, so the context resumes fine, and
  // if it's still blocked this fails silently rather than throwing.
  const playChime = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [
        { freq: 880, start: 0 },
        { freq: 1174, start: 0.14 },
      ].forEach(({ freq, start }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + 0.36);
      });
    } catch {
      /* audio unavailable / blocked — ignore */
    }
  };

  // Keep the ref in sync for the reminder interval to read.
  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    // Wait for the first real value from the server; while it's still loading
    // `data` is undefined and `count` is a placeholder 0.
    if (data === undefined) return;
    const prev = prevCountRef.current;
    prevCountRef.current = count;
    if (count <= 0) return; // all read → nothing to shake about
    if (prev === null) {
      // First server value this session and there are unread notifications —
      // shake to draw attention, but without sound (not a live arrival).
      triggerRing(false);
    } else if (count > prev) {
      // A genuinely new notification arrived while the page was open — shake
      // and play the chime.
      triggerRing(true);
    }
  }, [data, count]);

  // Reminder: every 30 minutes, as long as there are still unread
  // notifications (count > 0), shake the bell again (silently) so it doesn't
  // get forgotten. Stops on its own once everything is read. Set up once; reads
  // the live count via a ref.
  useEffect(() => {
    const THIRTY_MIN = 30 * 60 * 1000;
    const id = setInterval(() => {
      if (countRef.current > 0) {
        triggerRing(false);
      }
    }, THIRTY_MIN);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up any pending shake timer on unmount.
  useEffect(() => () => clearTimeout(ringTimerRef.current), []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border z-40">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left Section - Mobile Menu & Logo */}
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="lg:hidden"
              aria-label="Toggle navigation menu"
            >
              <Icon name={isSidebarOpen ? "X" : "Menu"} size={20} />
            </Button>

            {/* Desktop Logo - Always visible on desktop */}
            <div className="hidden lg:flex items-center space-x-3 ml-64">
              <div className="w-8 h-8 bg-mahroon-200 rounded-lg flex items-center justify-center">
                {/* <Icon name="Building2" size={20} color="white" /> */}
                <img src="assets/images/aajneeti-favicon.png" alt="" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-foreground">
                  CRM
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-mahroon text-white rounded-full">
                  By Aajneeti Connect ltd.
                </span>
              </div>
            </div>

            {/* Mobile Logo - Only visible on mobile */}
            <div className="flex items-center space-x-3 lg:hidden">
              <div className="flex items-center space-x-2" onClick={()=>navigate('/')}>
                <span className="text-lg font-semibold text-foreground">
                  CRM
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-mahroon-200 text-accent-foreground rounded-full">
                  ACL
                </span>
              </div>
            </div>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center space-x-2">
            <div className="relative" ref={notificationRef}>
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
                onClick={handleClick}
              >
                <Icon
                  name="Bell"
                  size={20}
                  className={`origin-top ${bellRinging ? "animate-bell-swing" : ""}`}
                />
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                    {bellRinging && (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                    )}
                    <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-semibold leading-none rounded-full ring-2 ring-background">
                      {count > 99 ? "99+" : count}
                    </span>
                  </span>
                )}
              </Button>
              {open && <NotificationDropdown />}
            </div>
            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={handleUserDropdownToggle}
                className="flex items-center space-x-3 p-2 rounded-lg bg-muted hover:bg-muted transition-smooth"
                aria-label="User account menu"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    <Avatar name={(LogInuser.username || "User")} size="32" round={true} />
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-foreground">
                    {(LogInuser.username || "User")}
                  </div>
                 
                </div>
                <Icon
                  name="ChevronDown"
                  size={16}
                  className={`transition-transform ${isUserDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isUserDropdownOpen && (
                <>
                  {/* blur overlay */}
                  <div
                    className="fixed inset-0 z-[10] bg-black/10 backdrop-blur-[2px]"
                    onClick={handleDropdownClose}
                  />

                  {/* dropdown */}
                  <div className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-2xl border border-white/20 bg-white/75 backdrop-blur-2xl shadow-[0_12px_40px_rgba(15,23,42,0.12)] z-[60] animate-in fade-in zoom-in-95 duration-200">

                    {/* top user section */}
                    <div className="p-5">
                      <div className="flex items-center gap-3">

                        {/* avatar */}
                        <div className="relative shrink-0">
                          <Avatar
                            name={(LogInuser.username || "User")}
                            size="46"
                            round={true}
                          />

                          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>

                        {/* user info */}
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {(LogInuser.username || "User")}
                          </h3>

                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Aajneeti Connect ltd
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* divider */}
                    <div className="h-px bg-slate-200/70" />

                    {/* menu */}
                    <div className="p-2">

                      {/* profile */}
                      <button
                        onClick={handleProfileClick}
                        className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm text-slate-700 transition-all hover:bg-white/70"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                          <Icon name="User" size={17} />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            Profile Settings
                          </div>

                          <div className="text-xs text-slate-500">
                            Manage account
                          </div>
                        </div>
                      </button>

                      {/* logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full rounded-xl px-3 py-3 text-sm text-red-500 transition-all hover:bg-red-50/80"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                          <Icon name="LogOut" size={17} />
                        </div>

                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            Sign Out
                          </div>

                          <div className="text-xs text-red-400">
                            Logout from account
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop for mobile dropdowns */}
      {/* {(isUserDropdownOpen || isHelpDropdownOpen) && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={handleDropdownClose}
        />
      )} */}
    </>
  );
};

export default Header;
