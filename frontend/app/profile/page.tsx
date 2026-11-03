import Link from 'next/link'
import { Building2, Landmark, MapPin, Send } from 'lucide-react'
import { Avatar, Card, Chip } from '@/components/atoms'
import ProfileJourney from '@/components/organisms/ProfileJourney'
import { getProfile } from '@/lib/data-api'
import { fmtNum } from '@/lib/format'

export const dynamic = 'force-dynamic'

export interface ProfilePageProps {
  searchParams: Promise<{ id?: string }>
}

/* Featured gold button, ditto of Btn variant="gold" in the old profile header. */
const GOLD_BTN =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-[#3d2b00] shadow-fab transition-all duration-150 active:translate-y-px'

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { id } = await searchParams
  const profile = await getProfile(id ?? 'me')
  const isMe = profile.id === 'me'
  const pointsEarned =
    profile.received.filter((credit) => credit.points).reduce((sum, credit) => sum + (credit.points ?? 0), 0) +
    (isMe ? 1240 : 0)

  return (
    <div>
      {/* Header */}
      <Card className="hero-room relative overflow-hidden p-0 text-white">
        <div className="dotgrid px-6 py-7 md:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar id={profile.id} size={86} />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-[34px]">{profile.name}</h1>
              <p className="mt-1 text-[15px] font-semibold text-white/80">
                {profile.title} · {profile.dept}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} /> {profile.office}
                </span>
                <span className="flex items-center gap-1.5">
                  <Landmark size={13} /> {profile.tenure}
                </span>
                {profile.managerName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 size={13} /> Reports to {profile.managerName}
                  </span>
                )}
              </div>
            </div>
            {isMe ? (
              <Chip className="shrink-0 self-start bg-gold px-3.5 py-2 text-[12px] font-extrabold text-[#3d2b00] sm:self-center">
                You
              </Chip>
            ) : (
              <Link href={`/recognize?to=${profile.id}`} className={`${GOLD_BTN} shrink-0 self-start sm:self-center`}>
                <Send size={15} /> Recognize
              </Link>
            )}
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
            {[
              ['Points earned', fmtNum(pointsEarned)],
              ['Received', String(profile.received.length)],
              ['Given', String(profile.given.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/10 px-4 py-3.5 backdrop-blur-sm">
                <p className="tnum text-[20px] font-extrabold text-gold">{value}</p>
                <p className="mt-0.5 text-[10px] font-bold font-mono uppercase tracking-wider text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <ProfileJourney received={profile.received} given={profile.given} />
    </div>
  )
}
