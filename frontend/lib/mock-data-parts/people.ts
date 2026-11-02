// Mock data — trimmed port of src/data.ts, dashboard datasets only.
// This is the ONLY file the dashboard talks to today; data-api.ts wraps it so
// Ayan's FastAPI slots in here later without touching components.

export interface Person {
  id: string
  name: string
  email: string
  title: string
  dept: string
  office: string
  tenure: string
  /** Direct manager id in the org tree; 'me' manages the direct reports. */
  managerId?: string
  status: 'online' | 'offline'
}

export const PEOPLE: Record<string, Person> = {
  me: {
    id: 'me',
    name: 'Ayan',
    email: 'ayan@emids.com',
    title: 'Senior Engineering Manager',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '6 yrs · joined Jul 2020',
    status: 'online',
  },
  p1: {
    id: 'p1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@emids.com',
    title: 'Data Engineer II',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'online',
  },
  p2: {
    id: 'p2',
    name: 'Daniel Cho',
    email: 'daniel.cho@emids.com',
    title: 'Principal Engineer',
    dept: 'Data Engineering',
    office: 'Tennessee',
    tenure: '7 yrs',
    managerId: 'me',
    status: 'offline',
  },
  p3: {
    id: 'p3',
    name: 'Priya Menon',
    email: 'priya.menon@emids.com',
    title: 'Analytics Lead',
    dept: 'Analytics',
    office: 'Noida',
    tenure: '4 yrs',
    managerId: 'me',
    status: 'online',
  },
  p4: {
    id: 'p4',
    name: 'Rohan Patel',
    email: 'rohan.patel@emids.com',
    title: 'Platform Engineer',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '1.5 yrs',
    managerId: 'me',
    status: 'online',
  },
  p5: {
    id: 'p5',
    name: 'Sofia Reyes',
    email: 'sofia.reyes@emids.com',
    title: 'QA Specialist',
    dept: 'Quality',
    office: 'Tennessee',
    tenure: '3 yrs',
    managerId: 'me',
    status: 'offline',
  },
  p6: {
    id: 'p6',
    name: 'Kenji Watanabe',
    email: 'kenji.watanabe@emids.com',
    title: 'Data Scientist',
    dept: 'Analytics',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'online',
  },
  p7: {
    id: 'p7',
    name: 'Emily Tran',
    email: 'emily.tran@emids.com',
    title: 'Product Designer',
    dept: 'Design',
    office: 'Tennessee',
    tenure: '5 yrs',
    managerId: 'vp',
    status: 'online',
  },
  p8: {
    id: 'p8',
    name: 'Vikram Rao',
    email: 'vikram.rao@emids.com',
    title: 'Delivery Director',
    dept: 'Delivery',
    office: 'Bengaluru',
    tenure: '8 yrs',
    managerId: 'vp',
    status: 'offline',
  },
  ceo: {
    id: 'ceo',
    name: 'Anand Desai',
    email: 'anand.desai@emids.com',
    title: 'Chief Executive Officer',
    dept: 'Executive',
    office: 'Tennessee',
    tenure: '10 yrs',
    status: 'offline',
  },
  vp: {
    id: 'vp',
    name: 'Kavita Nair',
    email: 'kavita.nair@emids.com',
    title: 'VP Engineering',
    dept: 'Data Engineering',
    office: 'Bengaluru',
    tenure: '9 yrs',
    managerId: 'ceo',
    status: 'online',
  },
  cto: {
    id: 'cto',
    name: 'Grace Liu',
    email: 'grace.liu@emids.com',
    title: 'Chief Technology Officer',
    dept: 'Executive',
    office: 'Tennessee',
    tenure: '7 yrs',
    managerId: 'ceo',
    status: 'online',
  },
  p9: {
    id: 'p9',
    name: 'Sanjay Kumar',
    email: 'sanjay.kumar@emids.com',
    title: 'Data Engineer I',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '10 mo',
    managerId: 'me',
    status: 'offline',
  },
  p10: {
    id: 'p10',
    name: 'Nia Thomas',
    email: 'nia.thomas@emids.com',
    title: 'Sr. Analyst',
    dept: 'Analytics',
    office: 'Noida',
    tenure: '3 yrs',
    managerId: 'me',
    status: 'online',
  },
  p11: {
    id: 'p11',
    name: 'David Park',
    email: 'david.park@emids.com',
    title: 'Cloud Architect',
    dept: 'Data Engineering',
    office: 'Tennessee',
    tenure: '5 yrs',
    managerId: 'vp',
    status: 'offline',
  },
  p12: {
    id: 'p12',
    name: 'Anjali Gupta',
    email: 'anjali.gupta@emids.com',
    title: 'EA, Engineering',
    dept: 'Operations',
    office: 'Bengaluru',
    tenure: '2 yrs',
    managerId: 'vp',
    status: 'online',
  },
  p13: {
    id: 'p13',
    name: 'Ishaan Verma',
    email: 'ishaan.verma@emids.com',
    title: 'Cloud Engineer II',
    dept: 'Data Engineering',
    office: 'Hyderabad',
    tenure: '1 yr',
    managerId: 'me',
    status: 'online',
  },
  p14: {
    id: 'p14',
    name: 'Grace Mathew',
    email: 'grace.mathew@emids.com',
    title: 'QA Lead',
    dept: 'Quality',
    office: 'Noida',
    tenure: '2 yrs',
    managerId: 'me',
    status: 'offline',
  },
}

export const person = (id: string): Person => PEOPLE[id] ?? PEOPLE.me

export const initials = (name: string) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
