import { openContractCall, AppConfig, UserSession } from '@stacks/connect'
import { stringAsciiCV, createSTXPostCondition, FungibleConditionCode } from '@stacks/transactions'
import { StacksMainnet } from '@stacks/network'
import { sendTip } from './stx'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''
export const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || 'signal-tips'

export async function contractTipSignal(
  signalId: string,
  onFinish?: (txId: string) => void
) {
  const address = userSession.loadUserData().profile.stxAddress.mainnet;

  // If no contract deployed yet, do direct STX transfer
  if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '' || CONTRACT_ADDRESS === 'YOUR_WALLET_ADDRESS') {
    console.log('[Contract] No contract deployed — using direct STX transfer')
    sendTip(`tip:${signalId.slice(0, 28)}`, onFinish)
    return
  }

  const postCondition = createSTXPostCondition(
    address,
    FungibleConditionCode.Equal,
    1000000
  );

  try {
    openContractCall({
      network: new StacksMainnet(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'tip-signal',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [postCondition],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => {
        console.log('Tip tx:', data.txId)
        onFinish?.(data.txId)
      },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Contract tip failed:', e)
    sendTip(signalId, onFinish)
  }
}

export async function contractVoteBullish(
  signalId: string,
  onFinish?: (txId: string) => void
) {
  if (!CONTRACT_ADDRESS) {
    alert('Voting requires the StackSense contract to be deployed. Connect to mainnet and deploy signal-tips.clar first.')
    return
  }

  try {
    openContractCall({
      network: new StacksMainnet(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'vote-bullish',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => { onFinish?.(data.txId) },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Vote bullish failed:', e)
  }
}

export async function contractVoteBearish(
  signalId: string,
  onFinish?: (txId: string) => void
) {
  if (!CONTRACT_ADDRESS) {
    alert('Voting requires the StackSense contract to be deployed. Connect to mainnet and deploy signal-tips.clar first.')
    return
  }

  try {
    openContractCall({
      network: new StacksMainnet(),
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'vote-bearish',
      functionArgs: [stringAsciiCV(signalId.slice(0, 64))],
      postConditions: [],
      appDetails: { name: 'StackSense', icon: '' },
      onFinish: (data: any) => { onFinish?.(data.txId) },
      onCancel: () => {},
      userSession,
    })
  } catch (e) {
    console.error('Vote bearish failed:', e)
  }
}

export async function getSignalTips(signalId: string): Promise<{ tipCount: number, tipTotal: number }> {
  if (!CONTRACT_ADDRESS) return { tipCount: 0, tipTotal: 0 }
  try {
    const url = `https://api.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-signal-tips`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: [stringAsciiCV(signalId.slice(0, 64)).toString()],
      }),
    })

    if (!response.ok) return { tipCount: 0, tipTotal: 0 }
    const data = await response.json()
    return { tipCount: Number(data.result?.value?.['tip-count']?.value || 0), tipTotal: 0 }
  } catch {
    return { tipCount: 0, tipTotal: 0 }
  }
}

export async function getSignalVotes(signalId: string): Promise<{ bullish: number, bearish: number }> {
  if (!CONTRACT_ADDRESS) return { bullish: 0, bearish: 0 }
  try {
    const url = `https://api.hiro.so/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-signal-votes`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: CONTRACT_ADDRESS,
        arguments: [stringAsciiCV(signalId.slice(0, 64)).toString()],
      }),
    })

    if (!response.ok) return { bullish: 0, bearish: 0 }
    const data = await response.json()
    const val = data.result?.value
    return {
      bullish: Number(val?.['bullish-votes']?.value || 0),
      bearish: Number(val?.['bearish-votes']?.value || 0),
    }
  } catch {
    return { bullish: 0, bearish: 0 }
  }
}
