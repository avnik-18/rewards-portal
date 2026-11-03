// Mock data — trimmed port of src/data.ts, dashboard datasets only.
// Directory record book: leadership here, reportees merged in from
// people-records-more.ts (kept under the 200-line rule).

import { PEOPLE_REPORTS } from './people-records-more'

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

const PEOPLE_LEADS: Record<string, Person> = {
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
}

export const PEOPLE: Record<string, Person> = {
  ...PEOPLE_LEADS,
  ...PEOPLE_REPORTS,
}
