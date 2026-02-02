import { supabase } from '@/lib/supabase'

export interface Ticket {
  id: string
  ticket_number: string
  subject: string
  description: string
  issue_type_id: string
  supplier_name: string
  city: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  status: 'new' | 'assigned' | 'in_progress' | 'pending' | 'resolved' | 'closed'
  assigned_to?: string
  team_id?: string
  sla_due_at?: string
  sla_status: 'on-track' | 'warning' | 'breached'
  ticket_group_id?: string
  created_by: string
  created_at: string
  updated_at: string
}

export const ticketService = {
  // Get all tickets
  async getAll() {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        issue_type:issue_types(name, icon),
        assigned_user:profiles!assigned_to(full_name),
        team:teams(name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get ticket by ID
  async getById(id: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        issue_type:issue_types(name, icon),
        assigned_user:profiles!assigned_to(full_name),
        team:teams(name),
        comments(*, user:profiles(full_name)),
        watchers:ticket_watchers(user:profiles(full_name))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create ticket
  async create(ticket: Partial<Ticket>) {
    const { data, error } = await supabase
      .from('tickets')
      .insert(ticket)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update ticket
  async update(id: string, updates: Partial<Ticket>) {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete ticket
  async delete(id: string) {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}