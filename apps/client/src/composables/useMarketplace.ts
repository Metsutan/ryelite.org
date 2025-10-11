import { ref } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

export interface MarketplaceListing {
  id: string
  user_id: number
  item_id: number
  quantity: number
  asking_price: number
  accepts_items: boolean
  accepts_partial_offers?: boolean
  notes: string
  listing_type: 'selling' | 'buying'
  status: string
  created_at: string
  updated_at: string
  seller_name: string
  seller_discord_id: string
  seller_discriminator?: string
  seller_avatar?: string
  seller_joined_date?: string
  offer_count?: number
}

export interface MarketplaceOffer {
  id: string
  listing_id: string
  user_id: number
  coin_offer: number
  quantity_requested?: number
  message: string
  status: string
  created_at: string
  updated_at: string
  buyer_name: string
  buyer_discord_id: string
  buyer_discriminator?: string
  buyer_avatar?: string
  item_offers: ItemOffer[]
}

export interface TradeConfirmation {
  id: string
  offer_id: string
  listing_id: string
  seller_confirmed: boolean
  buyer_confirmed: boolean
  seller_confirmed_at?: string
  buyer_confirmed_at?: string
  completed_at?: string
  status: string
  created_at: string
  updated_at: string
  user_role: 'seller' | 'buyer'
  // Listing details
  item_id: number
  quantity: number
  asking_price: number
  accepts_items: boolean
  notes: string
  // Offer details
  coin_offer: number
  message: string
  item_offers: ItemOffer[]
  // User details
  seller_name: string
  seller_discord_id: string
  seller_discriminator?: string
  seller_avatar?: string
  buyer_name: string
  buyer_discord_id: string
  buyer_discriminator?: string
  buyer_avatar?: string
}

export interface ItemOffer {
  id?: number
  offer_id?: string
  item_id: number
  quantity: number
}

export interface SellerProfile {
  id: number
  discord_id: string
  username: string
  discriminator?: string
  avatar?: string
  joined_date: string
  stats: {
    total_listings: number
    total_sales: number
    active_listings: number
    success_rate: number
  }
  listings: MarketplaceListing[]
  recent_trades: Array<{
    item_id: number
    quantity: number
    asking_price: number
    sold_date: string
  }>
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/marketplace`

export function useMarketplace() {
  const authStore = useAuthStore()
  const listings = ref<MarketplaceListing[]>([])
  const userListings = ref<MarketplaceListing[]>([])
  const userOffers = ref<MarketplaceOffer[]>([])
  const pendingTrades = ref<TradeConfirmation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get all active listings
  const fetchListings = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/listings`)
      listings.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch listings'
      console.error('Error fetching listings:', err)
    } finally {
      loading.value = false
    }
  }

  // Create a new listing
  const createListing = async (listingData: {
    itemId: number
    quantity: number
    askingPrice: number
    acceptsItems: boolean
    acceptsPartialOffers: boolean
    listingType: 'selling' | 'buying'
    notes?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/listings`, listingData)
      const newListing = response.data
      listings.value.unshift(newListing)
      userListings.value.unshift(newListing)
      return newListing
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create listing'
      console.error('Error creating listing:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a listing
  const updateListing = async (listingId: string, updateData: {
    quantity: number
    asking_price: number
    accepts_items: boolean
    accepts_partial_offers: boolean
    notes: string
  }) => {
    try {
      loading.value = true
      const response = await axios.put(`${API_BASE_URL}/listings/${listingId}`, updateData)
      
      // Update the listing in the local array
      const listingIndex = listings.value.findIndex(l => l.id === listingId)
      if (listingIndex !== -1) {
        listings.value[listingIndex] = { ...listings.value[listingIndex], ...response.data }
      }
      
      // Also update in userListings if it exists there
      const userListingIndex = userListings.value.findIndex(l => l.id === listingId)
      if (userListingIndex !== -1) {
        userListings.value[userListingIndex] = { ...userListings.value[userListingIndex], ...response.data }
      }
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update listing'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a listing
  const deleteListing = async (listingId: string) => {
    try {
      loading.value = true
      error.value = null
      await axios.delete(`${API_BASE_URL}/listings/${listingId}`)
      
      // Remove from both arrays
      listings.value = listings.value.filter(l => l.id !== listingId)
      userListings.value = userListings.value.filter(l => l.id !== listingId)
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to delete listing'
      console.error('Error deleting listing:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get offers for a listing
  const fetchOffersForListing = async (listingId: string): Promise<MarketplaceOffer[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/listings/${listingId}/offers`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch offers'
      console.error('Error fetching offers:', err)
      return []
    }
  }

  // Create an offer
  const createOffer = async (listingId: string, offerData: {
    coinOffer?: number
    quantityRequested?: number
    itemOffers?: ItemOffer[]
    message?: string
  }) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/listings/${listingId}/offers`, offerData)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to create offer'
      console.error('Error creating offer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Accept an offer
  const acceptOffer = async (offerId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/offers/${offerId}/accept`)
      
      // Refresh listings since the listing status changed
      await fetchListings()
      await fetchUserListings()
      await fetchPendingTrades()
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to accept offer'
      console.error('Error accepting offer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Accept a partial offer
  const acceptPartialOffer = async (offerId: string, acceptedQuantity: number) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/offers/${offerId}/accept-partial`, {
        acceptedQuantity
      })
      
      // Refresh listings and pending trades
      await fetchListings()
      await fetchUserListings()
      await fetchPendingTrades()
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to accept partial offer'
      console.error('Error accepting partial offer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Confirm trade completion
  const confirmTrade = async (tradeConfirmationId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/trades/${tradeConfirmationId}/confirm`)
      
      // Refresh pending trades and listings
      await fetchPendingTrades()
      await fetchListings()
      await fetchUserListings()
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to confirm trade'
      console.error('Error confirming trade:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Cancel pending trade
  const cancelTrade = async (tradeConfirmationId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.post(`${API_BASE_URL}/trades/${tradeConfirmationId}/cancel`)
      
      // Refresh pending trades and listings
      await fetchPendingTrades()
      await fetchListings()
      await fetchUserListings()
      
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to cancel trade'
      console.error('Error cancelling trade:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get pending trades for current user
  const fetchPendingTrades = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/my-pending-trades`)
      pendingTrades.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch pending trades'
      console.error('Error fetching pending trades:', err)
    } finally {
      loading.value = false
    }
  }

  // Reject an offer
  const rejectOffer = async (offerId: string) => {
    try {
      loading.value = true
      error.value = null
      await axios.post(`${API_BASE_URL}/offers/${offerId}/reject`)
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to reject offer'
      console.error('Error rejecting offer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get user's own listings
  const fetchUserListings = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/my-listings`)
      userListings.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch user listings'
      console.error('Error fetching user listings:', err)
    } finally {
      loading.value = false
    }
  }

  // Get user's offers
  const fetchUserOffers = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await axios.get(`${API_BASE_URL}/my-offers`)
      userOffers.value = response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch user offers'
      console.error('Error fetching user offers:', err)
    } finally {
      loading.value = false
    }
  }

  // Get seller profile
  const fetchSellerProfile = async (discordId: string): Promise<SellerProfile | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/seller/${discordId}`)
      return response.data
    } catch (err: any) {
      error.value = err.response?.data?.error || 'Failed to fetch seller profile'
      console.error('Error fetching seller profile:', err)
      return null
    }
  }

  // Helper to check if a listing belongs to the current user
  const isOwnListing = (listing: MarketplaceListing): boolean => {
    return authStore.user?.id === listing.user_id
  }

  // Helper to get offer count for a listing
  const getOfferCount = (_listingId: string): number => {
    // This would need to be calculated by fetching offers
    // For now, return 0 as a placeholder
    return 0
  }

  // Helper to get Discord avatar URL
  const getDiscordAvatarUrl = (discordId: string, avatar?: string): string => {
    if (!avatar) {
      // Return default Discord avatar
      const defaultAvatar = parseInt(discordId) % 5
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`
    }
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`
  }

  // Helper to format Discord username
  const formatDiscordUsername = (username: string, discriminator?: string): string => {
    if (discriminator && discriminator !== '0') {
      return `${username}#${discriminator}`
    }
    return `@${username}`
  }

  return {
    listings,
    userListings,
    userOffers,
    pendingTrades,
    loading,
    error,
    fetchListings,
    createListing,
    updateListing,
    deleteListing,
    fetchOffersForListing,
    createOffer,
    acceptOffer,
    acceptPartialOffer,
    rejectOffer,
    fetchUserListings,
    fetchUserOffers,
    fetchPendingTrades,
    confirmTrade,
    cancelTrade,
    fetchSellerProfile,
    isOwnListing,
    getOfferCount,
    getDiscordAvatarUrl,
    formatDiscordUsername
  }
}
