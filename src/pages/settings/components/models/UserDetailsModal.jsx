import Avatar from "react-avatar";
import Icon from "../../../../components/AppIcon";

/**
 * One tone per section, so the modal reads as three distinct groups rather
 * than one long column of grey. Colour is decoration only — every field is
 * labelled in words.
 */
const TONES = {
  rose: {
    tile: "bg-rose-50 text-rose-600",
    wash: "from-rose-50/60",
    ring: "ring-rose-100",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600",
    wash: "from-sky-50/60",
    ring: "ring-sky-100",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600",
    wash: "from-violet-50/60",
    ring: "ring-violet-100",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600",
    wash: "from-emerald-50/60",
    ring: "ring-emerald-100",
  },
};

const InfoRow = ({ icon, label, value, tone = "sky", valueClassName = "" }) => {
  const t = TONES[tone] || TONES.sky;
  return (
    <div className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
      <div
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${t.tile}`}
      >
        <Icon name={icon} size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        <div
          className={`mt-0.5 break-words text-[15px] font-semibold text-card-foreground ${valueClassName}`}
        >
          {value || value === 0 ? (
            value
          ) : (
            <span className="font-normal text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon, tone = "sky", children }) => {
  const t = TONES[tone] || TONES.sky;
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-gradient-to-br via-card to-card shadow-sm transition-shadow hover:shadow-md ${t.wash}`}
    >
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${t.tile}`}>
          <Icon name={icon} size={16} />
        </span>
        <h4 className="text-sm font-bold text-card-foreground">{title}</h4>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 px-2.5 pb-3 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
};

/** A contact line that is actually actionable — mailto: / tel:. */
const ContactLine = ({ icon, href, text, badges = [] }) => (
  <a
    href={href}
    className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
  >
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
      <Icon name={icon} size={14} />
    </span>
    <span className="min-w-0 flex-1 break-all text-sm font-medium text-card-foreground">
      {text}
    </span>
    {badges.filter(Boolean).map((b) => (
      <span
        key={b.label}
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${b.className}`}
      >
        {b.label}
      </span>
    ))}
  </a>
);

const UserDetailsModal = ({ user, onClose, getStatusBadge }) => {
  if (!user) return null;

  const emails =
    Array.isArray(user.emailAddressData) && user.emailAddressData.length
      ? user.emailAddressData
      : user.emailAddress
        ? [{ emailAddress: user.emailAddress, primary: true }]
        : [];

  const phones =
    Array.isArray(user.phoneNumberData) && user.phoneNumberData.length
      ? user.phoneNumberData
      : user.phoneNumber
        ? [{ phoneNumber: user.phoneNumber, type: "Mobile", primary: true }]
        : [];

  const teams = user.teamsNames
    ? Object.values(user.teamsNames)
    : user.defaultTeamName
      ? [user.defaultTeamName]
      : [];

  const roles = user.rolesNames ? Object.values(user.rolesNames) : [];

  const displayName =
    [user.salutationName, user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.name ||
    user.userName ||
    "—";

  return (
    <>
      <div
        className="animate-modal-fade fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="animate-modal-rise flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Icon name="UserCircle2" size={20} className="text-primary" />
              <h3 className="text-lg font-semibold">User Details</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition"
              aria-label="Close"
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="animate-modal-content overflow-y-auto">
            {/* Hero — a coloured banner with the avatar breaking its lower
                edge, so the modal opens on something that looks like a person
                rather than a form header. */}
            <div className="border-b border-border">
              <div className="px-6 py-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="rounded-full ring-4 ring-muted/60">
                    <Avatar
                      name={displayName}
                      size="80"
                      round
                      textSizeRatio={2}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-2xl font-bold tracking-tight text-card-foreground">
                        {displayName}
                      </h2>
                      {getStatusBadge?.(user.isActive ? "Active" : "Inactive")}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Icon name="AtSign" size={14} />
                        {user.userName || "—"}
                      </span>
                      {user.title && (
                        <span className="flex items-center gap-1.5">
                          <Icon name="Briefcase" size={14} />
                          {user.title}
                        </span>
                      )}
                      {user.type && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {user.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reach them without leaving the modal. */}
                  <div className="flex shrink-0 gap-2">
                    {emails[0]?.emailAddress && (
                      <a
                        href={`mailto:${emails[0].emailAddress}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                      >
                        <Icon name="Mail" size={14} />
                        Email
                      </a>
                    )}
                    {phones[0]?.phoneNumber && (
                      <a
                        href={`tel:${phones[0].phoneNumber}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-card-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                      >
                        <Icon name="Phone" size={14} />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="p-6 space-y-4">
              {/* Personal Information */}
              <SectionCard title="Personal Information" icon="User" tone="rose">
                <InfoRow icon="User" label="First Name" value={user.firstName} />
                <InfoRow icon="User" label="Last Name" value={user.lastName} />
                <InfoRow icon="Tag" label="Salutation" value={user.salutationName} />
                <InfoRow icon="Briefcase" label="Designation" value={user.title} />
                <InfoRow icon="UserCheck" label="Gender" value={user.gender} />
              </SectionCard>

              {/* Contact */}
              <SectionCard title="Contact" icon="Mail" tone="sky">
                <div className="p-2.5 md:col-span-2">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    Emails
                  </p>
                  {emails.length ? (
                    <ul className="space-y-2">
                      {emails.map((e, i) => (
                        <li key={i}>
                          <ContactLine
                            icon="Mail"
                            href={`mailto:${e.emailAddress}`}
                            text={e.emailAddress}
                            badges={[
                              e.primary && {
                                label: "Primary",
                                className: "bg-primary/10 text-primary",
                              },
                              e.invalid && {
                                label: "Invalid",
                                className: "bg-rose-100 text-rose-700",
                              },
                              e.optOut && {
                                label: "Opt-out",
                                className: "bg-muted text-muted-foreground",
                              },
                            ]}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                <div className="p-2.5 md:col-span-2">
                  <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                    Phones
                  </p>
                  {phones.length ? (
                    <ul className="space-y-2">
                      {phones.map((p, i) => (
                        <li key={i}>
                          <ContactLine
                            icon="Phone"
                            href={`tel:${p.phoneNumber}`}
                            text={p.phoneNumber}
                            badges={[
                              p.type && {
                                label: p.type,
                                className: "bg-muted text-muted-foreground",
                              },
                              p.primary && {
                                label: "Primary",
                                className: "bg-primary/10 text-primary",
                              },
                            ]}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </SectionCard>

              {/* Access Control */}
              <SectionCard title="Teams & Access Control" icon="Shield" tone="violet">
                <InfoRow
                  icon="ShieldCheck"
                  label="Type"
                  value={user.type}
                  valueClassName="capitalize"
                />
                <InfoRow
                  icon="ToggleRight"
                  label="Status"
                  value={getStatusBadge?.(user.isActive ? "Active" : "Inactive")}
                />
                <InfoRow
                  icon="Star"
                  label="Default Team"
                  tone="violet"
                  value={user.defaultTeamName}
                />

                {/* Teams and Roles go through InfoRow like every other field.
                    They used to carry their own hand-built markup with a
                    smaller grey tile and no row padding, so they sat a few
                    pixels off the grid the rest of the card lines up on. */}
                <InfoRow
                  icon="Users"
                  label="Teams"
                  tone="violet"
                  value={
                    teams.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {teams.map((t, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null
                  }
                />

                <InfoRow
                  icon="Key"
                  label="Roles"
                  tone="violet"
                  value={
                    roles.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((r, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : null
                  }
                />
              </SectionCard>

              {/* Activity */}
              <SectionCard title="Activity" icon="Clock">
                <InfoRow icon="UserPlus" label="Created By" value={user.createdByName} />
                <InfoRow icon="Calendar" label="Created At" value={user.createdAt} />
                <InfoRow icon="History" label="Modified At" value={user.modifiedAt} />
                <InfoRow icon="LogIn" label="Last Access" value={user.lastAccess} />
              </SectionCard>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border bg-card/80 flex justify-end">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDetailsModal;
