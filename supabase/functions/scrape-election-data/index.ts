import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface ScrapedMemberData {
  first_name: string;
  last_name: string;
  party_name: string;
  party_short_name?: string;
  electorate_name: string;
  total_votes_cast: number;
  current_margin_votes: number;
  current_margin_percentage: number;
  winner_two_party_preferred_percent: number;
  loser_two_party_preferred_percent: number;
  winner_two_party_preferred_votes: number;
  loser_two_party_preferred_votes: number;
  previous_margin_percentage: number;
  swing_percentage: number;
  source_url: string;
  scraped_at: string;
}

interface ScrapingResult {
  success: boolean;
  data: ScrapedMemberData[];
  errors: string[];
  totalFound: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stateCode, year } = await req.json()
    
    if (!stateCode || !year) {
      return new Response(
        JSON.stringify({ error: 'stateCode and year are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting scrape for ${stateCode.toUpperCase()} ${year}`)

    // Construct the ABC News URL for the specified state and year
    const abcUrl = `https://www.abc.net.au/news/elections/${stateCode}/${year}/results?sortBy=latest&filter=all&selectedRegion=all&selectedParty=all&partyWonBy=all&partyHeldBy=all`
    
    // Focus on ABC News scraping with improved data extraction
    const result = await scrapeABCNews(abcUrl, stateCode, year)

    const response = {
      success: result.success,
      data: result.data,
      errors: result.errors,
      totalFound: result.totalFound
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        data: [], 
        errors: [`Edge function error: ${error.message}`], 
        totalFound: 0 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function scrapeABCNews(url: string, stateCode: string, year: string): Promise<ScrapingResult> {
  if (!url) {
    return {
      success: false,
      data: [],
      errors: ['ABC News URL not provided'],
      totalFound: 0
    }
  }

  try {
    console.log(`Fetching ABC News data for ${stateCode.toUpperCase()} ${year} using direct API approach`)
    
    // Use the direct API endpoints that ABC News uses internally
    const apiEndpoints = [
      `https://www.abc.net.au/news-web/api/loader/channelrefetch?name=ElectionElectorateList&props=%7B%22meta%22%3A%7B%22year%22%3A%22${year}%22%2C%22state%22%3A%22${stateCode}%22%2C%22maxParties%22%3A4%2C%22maxSwing%22%3A15%2C%22totalSeats%22%3A93%2C%22toWin%22%3A47%2C%22showBooth%22%3Afalse%2C%22useV3%22%3Atrue%2C%22publishDate%22%3A%22${year}-03-25T17%3A00%3A00%2B10%3A00%22%2C%22remoteContentPath%22%3A%22https%3A%2F%2Fwww.abc.net.au%2Fdat%2Fnews%2Felections%2F${stateCode}%2F${year}%22%2C%22resultsDir%22%3A%22results%22%2C%22picturePath%22%3A%22https%3A%2F%2Fwww.abc.net.au%2Fdat%2Fnews%2Felections%2F${stateCode}%2F${year}%2Fguide%2Fphotos%2F%22%7D%7D`,
      `https://www.abc.net.au/dat/news/elections/${stateCode}/${year}/results/electorates.json`,
      `https://www.abc.net.au/dat/news/elections/${stateCode}/${year}/results/summary.json`
    ]

    const allMembers: ScrapedMemberData[] = []
    const errors: string[] = []

    for (const apiUrl of apiEndpoints) {
      try {
        console.log(`Trying ABC API endpoint: ${apiUrl}`)
        
        const response = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Referer': `https://www.abc.net.au/news/elections/${stateCode}/${year}/results`,
          }
        })

        if (!response.ok) {
          console.warn(`ABC API endpoint ${apiUrl} returned ${response.status}`)
          continue
        }

        const data = await response.json()
        console.log(`Successfully fetched data from ${apiUrl}`)
        
        const members = parseABCApiData(data, apiUrl)
        if (members.length > 0) {
          allMembers.push(...members)
          console.log(`Extracted ${members.length} members from ${apiUrl}`)
          break // If we got data from one endpoint, we can stop
        }
        
      } catch (error) {
        console.warn(`Failed to fetch from ${apiUrl}:`, error.message)
        errors.push(`ABC API ${apiUrl}: ${error.message}`)
      }
    }

    // Fallback to HTML scraping if API endpoints don't work
    if (allMembers.length === 0) {
      console.log('API endpoints failed, falling back to HTML scraping')
      const htmlResult = await scrapeABCNewsHTML(url)
      allMembers.push(...htmlResult.data)
      errors.push(...htmlResult.errors)
    }
    
    return {
      success: allMembers.length > 0,
      data: allMembers,
      errors: errors,
      totalFound: allMembers.length
    }
  } catch (error) {
    console.error('ABC News scraping error:', error)
    return {
      success: false,
      data: [],
      errors: [`ABC News scraping failed: ${error.message}`],
      totalFound: 0
    }
  }
}

async function scrapeABCNewsHTML(url: string): Promise<ScrapingResult> {
  try {
    console.log(`Fetching ABC News HTML from: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const members = parseABCNewsHTML(html, url)
    
    return {
      success: true,
      data: members,
      errors: [],
      totalFound: members.length
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`ABC News HTML scraping failed: ${error.message}`],
      totalFound: 0
    }
  }
}

function parseABCApiData(data: any, sourceUrl: string): ScrapedMemberData[] {
  const members: ScrapedMemberData[] = []
  
  try {
    console.log('Parsing ABC API data structure...')
    
    // The API response might have different structures, so we need to explore
    const findElectorateData = (obj: any, path: string = ''): any[] => {
      if (Array.isArray(obj)) {
        return obj.flatMap((item, index) => findElectorateData(item, `${path}[${index}]`))
      }
      
      if (obj && typeof obj === 'object') {
        // Look for common election data keys
        const keys = ['electorates', 'seats', 'results', 'candidates', 'data', 'content']
        
        for (const key of keys) {
          if (obj[key]) {
            if (Array.isArray(obj[key])) {
              console.log(`Found array at ${path}.${key} with ${obj[key].length} items`)
              return obj[key]
            } else if (typeof obj[key] === 'object') {
              const nested = findElectorateData(obj[key], `${path}.${key}`)
              if (nested.length > 0) return nested
            }
          }
        }
        
        // If no specific keys found, recursively search all properties
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null) {
            const nested = findElectorateData(value, `${path}.${key}`)
            if (nested.length > 0) return nested
          }
        }
      }
      
      return []
    }
    
    const electorateData = findElectorateData(data)
    console.log(`Found ${electorateData.length} potential electorate records`)
    
    for (const item of electorateData) {
      if (item && typeof item === 'object') {
        const member = extractMemberFromABCApiItem(item, sourceUrl)
        if (member) {
          members.push(member)
          console.log(`✓ Extracted: ${member.first_name} ${member.last_name} (${member.party_short_name}) - ${member.electorate_name}`)
        } else {
          console.log(`✗ Failed to extract member from item:`, Object.keys(item))
        }
      }
    }
    
    console.log(`Successfully parsed ${members.length} members from ABC API data`)
    
  } catch (error) {
    console.error('Failed to parse ABC API data:', error)
  }
  
  return members
}

function extractMemberFromABCApiItem(item: any, sourceUrl: string): ScrapedMemberData | null {
  try {
    // Extract electorate name
    const electorate = item.name || item.electorate || item.seat || item.electorateName || 
                      item.division || item.district || item.constituency || ''
    
    if (!electorate) {
      console.log(`No electorate found in item`)
      return null
    }
    
    console.log(`=== PROCESSING ELECTORATE: ${electorate} ===`)
    
    // Initialize all variables with defaults
    let totalVotesCast = 0
    let currentMarginVotes = 0
    let currentMarginPercentage = 0
    let winnerTwoPartyPreferredPercent = 0
    let loserTwoPartyPreferredPercent = 0
    let winnerTwoPartyPreferredVotes = 0
    let loserTwoPartyPreferredVotes = 0
    let previousMarginPercentage = 0
    let swingPercentage = 0
    let winnerName = ''
    let winnerParty = ''
    
    // Extract total votes cast from top-level fields
    totalVotesCast = extractVotes(item.totalVotes || item.totalEnrolment || '0')
    console.log(`Total votes cast: ${totalVotesCast}`)
    
    // Extract previous margin percentage
    previousMarginPercentage = extractPercentage(item.margin || '0')
    console.log(`Previous margin: ${previousMarginPercentage}%`)
    
    // CORRECTED: Access leadingCandidate and trailingCandidate directly from item
    const leadingCandidate = item.leadingCandidate
    const trailingCandidate = item.trailingCandidate
    
    if (!leadingCandidate) {
      console.log(`No leading candidate found for ${electorate}`)
      return null
    }
    
    console.log(`Leading candidate found: ${leadingCandidate.name}`)
    console.log(`Leading candidate data:`, JSON.stringify(leadingCandidate, null, 2))
    
    // Extract winner information from leadingCandidate
    winnerName = leadingCandidate.name || ''
    winnerParty = extractPartyName(leadingCandidate.party)
    
    // Extract TPP data from leadingCandidate (winner)
    const winnerTPPData = leadingCandidate.predicted2CP || leadingCandidate.simple2CP
    if (winnerTPPData) {
      winnerTwoPartyPreferredPercent = extractPercentage(winnerTPPData.pct || '0')
      winnerTwoPartyPreferredVotes = extractVotes(winnerTPPData.votes || '0')
      swingPercentage = extractSwing(winnerTPPData.swing || '0')
      
      console.log(`Winner TPP: ${winnerTwoPartyPreferredPercent}% (${winnerTwoPartyPreferredVotes} votes)`)
      console.log(`Swing: ${swingPercentage}%`)
    }
    
    // Extract TPP data from trailingCandidate (loser)
    if (trailingCandidate) {
      console.log(`Trailing candidate found: ${trailingCandidate.name}`)
      
      const loserTPPData = trailingCandidate.predicted2CP || trailingCandidate.simple2CP
      if (loserTPPData) {
        loserTwoPartyPreferredPercent = extractPercentage(loserTPPData.pct || '0')
        loserTwoPartyPreferredVotes = extractVotes(loserTPPData.votes || '0')
        
        console.log(`Loser TPP: ${loserTwoPartyPreferredPercent}% (${loserTwoPartyPreferredVotes} votes)`)
      }
    }
    
    // Calculate current margin from TPP data
    if (winnerTwoPartyPreferredVotes > 0 && loserTwoPartyPreferredVotes > 0) {
      currentMarginVotes = winnerTwoPartyPreferredVotes - loserTwoPartyPreferredVotes
      // FIXED: Calculate margin as difference from 50%, not winner minus loser
      currentMarginPercentage = winnerTwoPartyPreferredPercent - 50
      console.log(`Calculated current margin: ${currentMarginVotes} votes (${currentMarginPercentage}%)`)
    }
    
    // Validate essential data
    if (!winnerName) {
      console.log(`No winner name found for ${electorate}`)
      return null
    }
    
    const nameParts = winnerName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    if (!firstName || !lastName) {
      console.log(`Incomplete name for ${winnerName} in ${electorate}`)
      return null
    }
    
    console.log(`=== FINAL EXTRACTED DATA FOR ${electorate} ===`)
    console.log(`  Name: ${firstName} ${lastName}`)
    console.log(`  Party: ${winnerParty}`)
    console.log(`  Total votes cast: ${totalVotesCast}`)
    console.log(`  Current margin: ${currentMarginVotes} votes (${currentMarginPercentage}%)`)
    console.log(`  Winner TPP: ${winnerTwoPartyPreferredPercent}% (${winnerTwoPartyPreferredVotes} votes)`)
    console.log(`  Loser TPP: ${loserTwoPartyPreferredPercent}% (${loserTwoPartyPreferredVotes} votes)`)
    console.log(`  Previous margin: ${previousMarginPercentage}%`)
    console.log(`  Swing: ${swingPercentage}%`)
    
    return {
      first_name: firstName,
      last_name: lastName,
      party_name: winnerParty,
      party_short_name: generateShortName(winnerParty),
      electorate_name: electorate,
      total_votes_cast: totalVotesCast,
      current_margin_votes: currentMarginVotes,
      current_margin_percentage: currentMarginPercentage,
      winner_two_party_preferred_percent: winnerTwoPartyPreferredPercent,
      loser_two_party_preferred_percent: loserTwoPartyPreferredPercent,
      winner_two_party_preferred_votes: winnerTwoPartyPreferredVotes,
      loser_two_party_preferred_votes: loserTwoPartyPreferredVotes,
      previous_margin_percentage: previousMarginPercentage,
      swing_percentage: swingPercentage,
      source_url: sourceUrl,
      scraped_at: new Date().toISOString()
    }
  } catch (error) {
    console.warn('Failed to extract member from ABC API item:', error)
  }
  
  return null
}

function extractPartyName(partyData: any): string {
  let rawPartyName = ''
  
  if (typeof partyData === 'string') {
    rawPartyName = partyData
  } else if (typeof partyData === 'object' && partyData !== null) {
    rawPartyName = partyData.name || partyData.short || partyData.fullName || 'Independent'
  } else {
    rawPartyName = 'Independent'
  }
  
  // STANDARDIZE PARTY NAMES - Map common variations to canonical names
  const canonicalNames: { [key: string]: string } = {
    // Labor Party variations
    'Labor Party': 'Australian Labor Party',
    'Labor': 'Australian Labor Party',
    'ALP': 'Australian Labor Party',
    'Australian Labor Party': 'Australian Labor Party',
    
    // Liberal National Party variations
    'Liberal National Party': 'Liberal National Party',
    'Liberal National': 'Liberal National Party',
    'LNP': 'Liberal National Party',
    
    // Liberal Party variations
    'Liberal Party': 'Liberal Party',
    'Liberal': 'Liberal Party',
    'LIB': 'Liberal Party',
    
    // Greens variations
    'The Greens': 'Australian Greens',
    'Australian Greens': 'Australian Greens',
    'Greens': 'Australian Greens',
    'GRN': 'Australian Greens',
    
    // One Nation variations
    'One Nation': 'Pauline Hanson\'s One Nation',
    'Pauline Hanson\'s One Nation': 'Pauline Hanson\'s One Nation',
    'PHON': 'Pauline Hanson\'s One Nation',
    'ON': 'Pauline Hanson\'s One Nation',
    
    // Katter's Australian Party
    'Katter\'s Australian Party': 'Katter\'s Australian Party',
    'KAP': 'Katter\'s Australian Party',
    
    // Independent
    'Independent': 'Independent',
    'IND': 'Independent'
  }
  
  // Return canonical name if found, otherwise return the original
  const canonical = canonicalNames[rawPartyName]
  if (canonical) {
    console.log(`Standardized party name: "${rawPartyName}" -> "${canonical}"`)
    return canonical
  }
  
  console.log(`Using original party name: "${rawPartyName}"`)
  return rawPartyName || 'Independent'
}

function parseABCNewsHTML(html: string, sourceUrl: string): ScrapedMemberData[] {
  const members: ScrapedMemberData[] = []
  
  try {
    // ABC News uses React and dynamic content, so we need to look for JSON data or specific patterns
    
    // Look for JSON data embedded in script tags
    const jsonMatches = html.match(/<script[^>]*>.*?window\.__INITIAL_STATE__\s*=\s*({.*?});.*?<\/script>/s) ||
                       html.match(/<script[^>]*>.*?window\.__ABC_DATA__\s*=\s*({.*?});.*?<\/script>/s) ||
                       html.match(/<script[^>]*type="application\/json"[^>]*>({.*?})<\/script>/gs)

    if (jsonMatches) {
      for (const match of jsonMatches) {
        try {
          const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim()
          const cleanJsonStr = jsonStr.replace(/^.*?=\s*/, '').replace(/;.*$/, '')
          const data = JSON.parse(cleanJsonStr)
          
          // Extract election data from the JSON structure
          const extractedMembers = extractMembersFromABCData(data, sourceUrl)
          members.push(...extractedMembers)
        } catch (e) {
          console.warn('Failed to parse JSON data:', e)
        }
      }
    }

    // Fallback: Look for HTML patterns
    if (members.length === 0) {
      // Look for candidate cards or result items
      const candidatePatterns = [
        /<div[^>]*class="[^"]*candidate[^"]*"[^>]*>.*?<\/div>/gs,
        /<div[^>]*class="[^"]*result[^"]*"[^>]*>.*?<\/div>/gs,
        /<tr[^>]*class="[^"]*candidate[^"]*"[^>]*>.*?<\/tr>/gs,
        /<article[^>]*>.*?<\/article>/gs
      ]

      for (const pattern of candidatePatterns) {
        const matches = html.match(pattern)
        if (matches) {
          for (const match of matches) {
            const member = extractMemberFromABCHTML(match, sourceUrl)
            if (member) {
              members.push(member)
            }
          }
        }
      }
    }

    console.log(`ABC News: Found ${members.length} members`)
    
  } catch (error) {
    console.error('Failed to parse ABC News HTML:', error)
  }
  
  return members
}

function extractMembersFromABCData(data: any, sourceUrl: string): ScrapedMemberData[] {
  const members: ScrapedMemberData[] = []
  
  try {
    // Navigate through the data structure to find election results
    const findElectionData = (obj: any): any[] => {
      if (Array.isArray(obj)) {
        return obj.flatMap(findElectionData)
      }
      
      if (obj && typeof obj === 'object') {
        // Look for common election data keys
        const keys = ['candidates', 'results', 'electorates', 'seats', 'members']
        
        for (const key of keys) {
          if (obj[key] && Array.isArray(obj[key])) {
            return obj[key]
          }
        }
        
        // Recursively search nested objects
        return Object.values(obj).flatMap(findElectionData)
      }
      
      return []
    }
    
    const electionData = findElectionData(data)
    
    for (const item of electionData) {
      if (item && typeof item === 'object') {
        const member = extractMemberFromDataObject(item, sourceUrl)
        if (member) {
          members.push(member)
        }
      }
    }
    
  } catch (error) {
    console.warn('Failed to extract members from ABC data:', error)
  }
  
  return members
}

function extractMemberFromDataObject(obj: any, sourceUrl: string): ScrapedMemberData | null {
  try {
    // Extract name
    const name = obj.name || obj.candidateName || obj.fullName || ''
    const firstName = obj.firstName || name.split(' ')[0] || ''
    const lastName = obj.lastName || name.split(' ').slice(1).join(' ') || ''
    
    // Extract party
    const partyName = obj.party || obj.partyName || obj.politicalParty || ''
    
    // Extract electorate
    const electorate = obj.electorate || obj.seat || obj.division || ''
    
    // Extract vote data with new structure
    const totalVotesCast = extractVotes(obj.totalVotes || obj.margin || '0')
    const currentMarginVotes = extractVotes(obj.marginVotes || obj.votes || '0')
    const currentMarginPercentage = extractPercentage(obj.marginPercent || obj.margin || '0')
    const winnerTwoPartyPreferredPercent = extractPercentage(obj.winnerTPP || '0')
    const loserTwoPartyPreferredPercent = extractPercentage(obj.loserTPP || '0')
    const winnerTwoPartyPreferredVotes = extractVotes(obj.winnerTPPVotes || '0')
    const loserTwoPartyPreferredVotes = extractVotes(obj.loserTPPVotes || '0')
    const previousMarginPercentage = extractPercentage(obj.previousMargin || '0')
    const swingPercentage = extractSwing(obj.swing || obj.swingPercent || '0')
    
    if (firstName && lastName && partyName && electorate) {
      return {
        first_name: firstName,
        last_name: lastName,
        party_name: extractPartyName(partyName), // Apply standardization here too
        party_short_name: generateShortName(extractPartyName(partyName)),
        electorate_name: electorate,
        total_votes_cast: totalVotesCast,
        current_margin_votes: currentMarginVotes,
        current_margin_percentage: currentMarginPercentage,
        winner_two_party_preferred_percent: winnerTwoPartyPreferredPercent,
        loser_two_party_preferred_percent: loserTwoPartyPreferredPercent,
        winner_two_party_preferred_votes: winnerTwoPartyPreferredVotes,
        loser_two_party_preferred_votes: loserTwoPartyPreferredVotes,
        previous_margin_percentage: previousMarginPercentage,
        swing_percentage: swingPercentage,
        source_url: sourceUrl,
        scraped_at: new Date().toISOString()
      }
    }
  } catch (error) {
    console.warn('Failed to extract member from data object:', error)
  }
  
  return null
}

function extractMemberFromABCHTML(html: string, sourceUrl: string): ScrapedMemberData | null {
  try {
    // Remove HTML tags and extract text content
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    
    // Look for patterns in the text
    const nameMatch = textContent.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
    const partyMatch = textContent.match(/(Labor|Liberal|Greens|One Nation|Independent|LNP|ALP)/i)
    const electorateMatch = textContent.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)
    const marginMatch = textContent.match(/(\d+(?:,\d+)*)\s*(?:votes?)?\s*\((\d+\.?\d*)%\)/)
    const swingMatch = textContent.match(/([+-]?\d+\.?\d*)%?\s*swing/i)
    
    if (nameMatch && partyMatch && electorateMatch) {
      const fullName = nameMatch[1]
      const [firstName, ...lastNameParts] = fullName.split(' ')
      const lastName = lastNameParts.join(' ')
      
      return {
        first_name: firstName,
        last_name: lastName,
        party_name: extractPartyName(partyMatch[1]), // Apply standardization here too
        party_short_name: generateShortName(extractPartyName(partyMatch[1])),
        electorate_name: electorateMatch[1],
        total_votes_cast: marginMatch ? parseInt(marginMatch[1].replace(/,/g, ''), 10) : 0,
        current_margin_votes: marginMatch ? parseInt(marginMatch[1].replace(/,/g, ''), 10) : 0,
        current_margin_percentage: marginMatch ? parseFloat(marginMatch[2]) : 0,
        winner_two_party_preferred_percent: 0,
        loser_two_party_preferred_percent: 0,
        winner_two_party_preferred_votes: 0,
        loser_two_party_preferred_votes: 0,
        previous_margin_percentage: 0,
        swing_percentage: swingMatch ? parseFloat(swingMatch[1]) : 0,
        source_url: sourceUrl,
        scraped_at: new Date().toISOString()
      }
    }
  } catch (error) {
    console.warn('Failed to extract member from ABC HTML:', error)
  }
  
  return null
}

function extractVotes(text: string | number): number {
  if (typeof text === 'number') return Math.floor(text)
  
  const match = text.toString().match(/[\d,]+/)
  if (match) {
    return parseInt(match[0].replace(/,/g, ''), 10) || 0
  }
  return 0
}

function extractPercentage(text: string | number): number {
  if (typeof text === 'number') return text
  
  const match = text.toString().match(/(\d+\.?\d*)%?/)
  if (match) {
    return parseFloat(match[1]) || 0
  }
  return 0
}

function extractSwing(text: string | number): number {
  if (typeof text === 'number') return text
  
  const match = text.toString().match(/([+-]?\d+\.?\d*)%?/)
  if (match) {
    return parseFloat(match[1]) || 0
  }
  return 0
}

function generateShortName(fullName: string): string {
  // Add type checking to prevent the error
  if (typeof fullName !== 'string') {
    console.warn('generateShortName received non-string input:', typeof fullName, fullName)
    return 'UNK'
  }

  const shortNames: { [key: string]: string } = {
    'Australian Labor Party': 'ALP',
    'Labor Party': 'ALP',
    'Labor': 'ALP',
    'Liberal National Party': 'LNP',
    'Liberal National': 'LNP',
    'Liberal Party': 'LIB',
    'Liberal': 'LIB',
    'The Greens': 'GRN',
    'Australian Greens': 'GRN',
    'Greens': 'GRN',
    'One Nation': 'ON',
    'Pauline Hanson\'s One Nation': 'PHON',
    'Katter\'s Australian Party': 'KAP',
    'Independent': 'IND'
  }

  return shortNames[fullName] || fullName.split(' ').map(word => word[0]).join('').toUpperCase()
}

function removeDuplicates(members: ScrapedMemberData[]): ScrapedMemberData[] {
  const seen = new Set<string>()
  return members.filter(member => {
    const key = `${member.first_name}-${member.last_name}-${member.electorate_name}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}