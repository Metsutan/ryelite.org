import axios from 'axios';

export interface DiscordNotificationData {
  discordId: string;
  username: string;
  discriminator?: string;
  avatar?: string;
}

export interface ListingNotificationData {
  id: string;
  itemName: string;
  quantity: number;
  askingPrice: number;
  acceptsItems: boolean;
  listingType?: 'selling' | 'buying';
  notes?: string;
}

export interface OfferNotificationData {
  id: string;
  listingId: string;
  coinOffer?: number;
  message?: string;
  buyerName: string;
  buyerDiscordId?: string;
}

class DiscordNotificationService {
  private get webhookUrl(): string | undefined {
    return process.env.DISCORD_WEBHOOK_URL;
  }

  private get botToken(): string | undefined {
    return process.env.DISCORD_BOT_TOKEN;
  }

  private get frontendUrl(): string {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  private isConfigured(): boolean {
    return !!(this.webhookUrl || this.botToken);
  }

  private getMarketplaceUrl(listingId?: string): string {
    const baseUrl = `${this.frontendUrl}/marketplace`;
    return listingId ? `${baseUrl}?listing=${listingId}` : baseUrl;
  }

  private getAvatarUrl(discordId: string, avatar?: string): string {
    if (!avatar) {
      const defaultAvatar = parseInt(discordId) % 5;
      return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`;
  }

  private formatQuantity(quantity: number): string {
    return quantity === -1 ? '∞' : quantity.toString();
  }

  private sanitizeForDiscord(text: string): string {
    if (!text) return text;
    
    return text
      // Escape Discord markdown characters
      .replace(/[*_`~|\\]/g, '\\$&')
      // Remove or escape @ mentions to prevent unwanted pings
      .replace(/@(everyone|here)/gi, '@​$1') // Zero-width space to break mentions
      .replace(/@([a-zA-Z0-9_]+)/g, '@​$1') // Break user mentions with zero-width space
      // Remove discord channel mentions
      .replace(/<#\d+>/g, '[channel]')
      // Remove role mentions
      .replace(/<@&\d+>/g, '[role]')
      // Remove user mentions with IDs
      .replace(/<@!?\d+>/g, '[user]')
      // Limit length to prevent spam
      .substring(0, 1000);
  }

  // Send notification via webhook (to a channel)
  private async sendWebhookNotification(embed: any, content?: string): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const payload: any = {
        embeds: [embed]
      };
      
      if (content) {
        payload.content = content;
      }
      
      await axios.post(this.webhookUrl, payload);
    } catch (error: any) {
      console.error('Failed to send webhook notification:', error.response?.data || error.message);
    }
  }

  // Send DM via bot (requires bot token and user to have DMs enabled)
  private async sendDirectMessage(discordId: string, embed: any): Promise<void> {
    if (!this.botToken) return;

    try {
      // Create DM channel
      const dmChannelResponse = await axios.post(
        'https://discord.com/api/v10/users/@me/channels',
        {
          recipient_id: discordId
        },
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const channelId = dmChannelResponse.data.id;

      // Send message to DM channel
      await axios.post(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          embeds: [embed]
        },
        {
          headers: {
            'Authorization': `Bot ${this.botToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error: any) {
      // Fallback to webhook if DM fails
      console.error('Failed to send direct message:', error.response?.data || error.message);
      if (this.webhookUrl) {
        await this.sendWebhookNotification(embed);
      }
    }
  }

  async notifyListingCreated(
    user: DiscordNotificationData,
    listing: ListingNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const listingType = listing.listingType || 'selling';
    const listingVerb = listingType === 'buying' ? 'Buying Request' : 'Selling Listing';
    const listingAction = listingType === 'buying' ? 'looking to buy' : 'selling';
    
    const marketplaceUrl = this.getMarketplaceUrl(listing.id);
    const embed = {
      title: `🛍️ New ${listingVerb} Created`,
      description: `Your ${listingType} listing for **${listing.itemName}** has been created successfully! You are ${listingAction} this item.`,
      color: listingType === 'buying' ? 0x0099ff : 0x00ff00, // Blue for buying, Green for selling
      fields: [
        {
          name: '📦 Item',
          value: listing.itemName,
          inline: true
        },
        {
          name: '🔢 Quantity',
          value: this.formatQuantity(listing.quantity),
          inline: true
        },
        {
          name: listingType === 'buying' ? '💰 Offering Price' : '💰 Asking Price',
          value: `${listing.askingPrice} coins`,
          inline: true
        },
        {
          name: '🔄 Accepts Trades',
          value: listing.acceptsItems ? 'Yes' : 'No',
          inline: true
        },
        {
          name: '🔗 Direct Link',
          value: `[View on Marketplace](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(user.discordId, user.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (listing.notes) {
      embed.fields.splice(-1, 0, {
        name: '📝 Notes',
        value: this.sanitizeForDiscord(listing.notes),
        inline: false
      });
    }

    // Try DM first, fallback to webhook with mention
    if (this.botToken) {
      await this.sendDirectMessage(user.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${user.discordId}> Your marketplace ${listingType} listing has been created!`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }

  async notifyListingUpdated(
    user: DiscordNotificationData,
    listing: ListingNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const listingType = listing.listingType || 'selling';
    const listingVerb = listingType === 'buying' ? 'Buying Request' : 'Selling Listing';
    
    const marketplaceUrl = this.getMarketplaceUrl(listing.id);
    const embed = {
      title: `✏️ ${listingVerb} Updated`,
      description: `Your ${listingType} listing for **${listing.itemName}** has been updated successfully!`,
      color: 0xffa500, // Orange for updates
      fields: [
        {
          name: '📦 Item',
          value: listing.itemName,
          inline: true
        },
        {
          name: '🔢 Quantity',
          value: this.formatQuantity(listing.quantity),
          inline: true
        },
        {
          name: listingType === 'buying' ? '💰 Offering Price' : '💰 Asking Price',
          value: `${listing.askingPrice} coins`,
          inline: true
        },
        {
          name: '🔄 Accepts Trades',
          value: listing.acceptsItems ? 'Yes' : 'No',
          inline: true
        },
        {
          name: '🔗 Direct Link',
          value: `[View on Marketplace](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(user.discordId, user.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (listing.notes) {
      embed.fields.splice(-1, 0, {
        name: '📝 Notes',
        value: this.sanitizeForDiscord(listing.notes),
        inline: false
      });
    }

    // Try DM first, fallback to webhook with mention
    if (this.botToken) {
      await this.sendDirectMessage(user.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${user.discordId}> Your marketplace ${listingType} listing has been updated!`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }

  async notifyListingRemoved(
    user: DiscordNotificationData,
    listing: ListingNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const marketplaceUrl = this.getMarketplaceUrl();
    const embed = {
      title: '🗑️ Listing Removed',
      description: `Your listing for **${listing.itemName}** has been removed.`,
      color: 0xff0000, // Red
      fields: [
        {
          name: '📦 Item',
          value: listing.itemName,
          inline: true
        },
        {
          name: '🔢 Quantity',
          value: this.formatQuantity(listing.quantity),
          inline: true
        },
        {
          name: '💰 Asking Price',
          value: `${listing.askingPrice} coins`,
          inline: true
        },
        {
          name: '🔗 Marketplace',
          value: `[Browse Other Listings](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(user.discordId, user.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (this.botToken) {
      await this.sendDirectMessage(user.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${user.discordId}> Your marketplace listing has been removed.`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }

  async notifyOfferReceived(
    seller: DiscordNotificationData,
    listing: ListingNotificationData,
    offer: OfferNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const marketplaceUrl = this.getMarketplaceUrl(listing.id);
    const buyerMention = offer.buyerDiscordId ? `<@${offer.buyerDiscordId}>` : offer.buyerName;
    
    const embed = {
      title: '🤝 New Offer Received',
      description: `You received a new offer for your **${listing.itemName}** listing!`,
      color: 0x0099ff, // Blue
      fields: [
        {
          name: '📦 Your Item',
          value: `${this.formatQuantity(listing.quantity)}x ${listing.itemName}`,
          inline: true
        },
        {
          name: '👤 Buyer',
          value: this.sanitizeForDiscord(offer.buyerName),
          inline: true
        },
        {
          name: '🔗 View Listing',
          value: `[Open in Marketplace](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(seller.discordId, seller.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (offer.coinOffer) {
      embed.fields.splice(-1, 0, {
        name: '💰 Coin Offer',
        value: `${offer.coinOffer} coins`,
        inline: true
      });
    }

    if (offer.message) {
      embed.fields.splice(-1, 0, {
        name: '💬 Message',
        value: this.sanitizeForDiscord(offer.message),
        inline: false
      });
    }

    if (this.botToken) {
      await this.sendDirectMessage(seller.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${seller.discordId}> You have a new offer from ${buyerMention}!`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }

  async notifyOfferAccepted(
    buyer: DiscordNotificationData,
    listing: ListingNotificationData,
    offer: OfferNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const marketplaceUrl = this.getMarketplaceUrl();
    const embed = {
      title: '✅ Offer Accepted',
      description: `Your offer for **${listing.itemName}** has been accepted!`,
      color: 0x00ff00, // Green
      fields: [
        {
          name: '📦 Item',
          value: `${this.formatQuantity(listing.quantity)}x ${listing.itemName}`,
          inline: true
        },
        {
          name: '🔗 Marketplace',
          value: `[Browse More Items](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(buyer.discordId, buyer.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (offer.coinOffer) {
      embed.fields.splice(-1, 0, {
        name: '💰 Your Offer',
        value: `${offer.coinOffer} coins`,
        inline: true
      });
    }

    if (this.botToken) {
      await this.sendDirectMessage(buyer.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${buyer.discordId}> Great news! Your offer has been accepted!`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }

  async notifyOfferRejected(
    buyer: DiscordNotificationData,
    listing: ListingNotificationData,
    offer: OfferNotificationData
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const marketplaceUrl = this.getMarketplaceUrl(listing.id);
    const embed = {
      title: '❌ Offer Declined',
      description: `Your offer for **${listing.itemName}** was declined.`,
      color: 0xff9900, // Orange
      fields: [
        {
          name: '📦 Item',
          value: `${this.formatQuantity(listing.quantity)}x ${listing.itemName}`,
          inline: true
        },
        {
          name: '🔗 View Listing',
          value: `[Make Another Offer](${marketplaceUrl})`,
          inline: false
        }
      ],
      thumbnail: {
        url: this.getAvatarUrl(buyer.discordId, buyer.avatar)
      },
      footer: {
        text: 'Marketplace Notification',
        icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
      },
      timestamp: new Date().toISOString()
    };

    if (offer.coinOffer) {
      embed.fields.splice(-1, 0, {
        name: '💰 Your Offer',
        value: `${offer.coinOffer} coins`,
        inline: true
      });
    }

    if (this.botToken) {
      await this.sendDirectMessage(buyer.discordId, embed);
    } else if (this.webhookUrl) {
      const mentionContent = `<@${buyer.discordId}> Your offer was declined, but don't give up!`;
      await this.sendWebhookNotification(embed, mentionContent);
    }
  }
}

export const discordNotifications = new DiscordNotificationService();
