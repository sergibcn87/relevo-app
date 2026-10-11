import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarCheck, Home, Leaf, LogOut, Map, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { GuideTour, GUIDE_VERSION, type GuideRole } from "@/components/guide-tour";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthedShell,
});

const desktopNav = [
  { to: "/inicio", label: "Resumen", icon: Home },
  { to: "/planes", label: "Planes", icon: Map },
  { to: "/visitas", label: "Visitas", icon: CalendarCheck },
  { to: "/fichas", label: "Fichas", icon: Leaf },
  { to: "/cuenta", label: "Cuenta", icon: UserRound },
] as const;

const mobileNav = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/visitas", label: "Visitas", icon: CalendarCheck },
  { to: "/fichas", label: "Fichas", icon: Leaf },
] as const;

function AuthedShell() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", user.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);
      return count ?? 0;
    },
    refetchOnWindowFocus: true,
  });

  // Guía interactiva: rol según si tiene casa propia o solo planes como cuidador
  const { data: tourContext } = useQuery({
    queryKey: ["tour-context", user.id],
    queryFn: async () => {
      const [{ count: ownedHouses }, { count: caregiverPlans }] = await Promise.all([
        supabase.from("houses").select("id", { count: "exact", head: true }),
        supabase
          .from("plans")
          .select("id", { count: "exact", head: true })
          .eq("caregiver_id", user.id),
      ]);
      return { ownedHouses: ownedHouses ?? 0, caregiverPlans: caregiverPlans ?? 0 };
    },
  });

  const guideRole: GuideRole =
    !tourContext || tourContext.ownedHouses > 0 || tourContext.caregiverPlans === 0
      ? "propietario"
      : "cuidador";

  const { data: guideStatus } = useQuery({
    queryKey: ["guide-state", user.id, guideRole],
    enabled: !!tourContext,
    queryFn: async () => {
      const { data } = await supabase
        .from("guide_states")
        .select("status")
        .eq("user_id", user.id)
        .eq("role", guideRole)
        .eq("version", GUIDE_VERSION)
        .maybeSingle();
      return data?.status ?? "no_iniciada";
    },
  });

  const [tourClosed, setTourClosed] = useState(false);

  async function finishTour(status: "completada" | "omitida") {
    setTourClosed(true);
    await supabase.from("guide_states").upsert(
      {
        user_id: user.id,
        role: guideRole,
        version: GUIDE_VERSION,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,role,version" },
    );
  }

  const showTour = !tourClosed && guideStatus === "no_iniciada";

  // Aviso de retraso: al abrir la app se comprueba si alguna visita superó
  // su margen de 90 minutos desde el primer check (sin tarea programada;
  // como mucho una comprobación cada 15 minutos por dispositivo).
  useEffect(() => {
    const KEY = "relevo-delay-check-at";
    const last = Number(localStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 15 * 60_000) return;
    localStorage.setItem(KEY, String(Date.now()));
    fetch("/api/public/hooks/visitas-retrasadas", {
      method: "POST",
      headers: { authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const displayName = profile?.display_name || "Tu cuenta";
  const initial = displayName.trim().charAt(0).toUpperCase() || "R";

  const bell = (
    <Link
      to="/avisos"
      data-tour="nav-avisos"
      aria-label={`Avisos${unread > 0 ? `, ${unread} sin leer` : ""}`}
      className="relative flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary/60"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );

  const avatarMenu = (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        data-tour="menu-cuenta"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Menú de cuenta"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
      >
        {initial}
      </button>
      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-13 z-50 w-56 rounded-2xl border border-border bg-popover p-2 shadow-lg animate-fade-up"
        >
          <p className="truncate px-3 py-2 text-sm font-semibold text-popover-foreground">
            {displayName}
          </p>
          <Link
            to="/cuenta"
            onClick={() => setMenuOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-popover-foreground hover:bg-secondary/60"
          >
            <UserRound className="h-4 w-4" aria-hidden /> Cuenta
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" aria-hidden /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Cabecera móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/inicio" aria-label="Ir al inicio">
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          {bell}
          {avatarMenu}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Barra lateral escritorio */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
          <Link to="/inicio" aria-label="Ir al inicio" className="px-2">
            <Logo />
          </Link>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Navegación principal">
            {desktopNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                data-tour={`nav-${item.to.slice(1)}`}
                activeOptions={{ exact: true }}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex items-center justify-between gap-1">
            {bell}
            {avatarMenu}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Navegación inferior móvil en cápsula */}
      <nav
        aria-label="Navegación inferior"
        className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-sm items-center justify-around rounded-full bg-primary px-2 py-2 shadow-lg md:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {mobileNav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            data-tour={`mnav-${item.to.slice(1)}`}
            activeOptions={{ exact: true }}
            aria-label={item.label}
            className={cn(
              "flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-4 py-1.5 text-[11px] font-semibold text-primary-foreground/70 transition-colors",
            )}
            activeProps={{
              className: "bg-primary-foreground/15 text-primary-foreground",
            }}
          >
          <item.icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>

      {showTour && <GuideTour role={guideRole} onFinish={finishTour} />}
    </div>
  );
}
