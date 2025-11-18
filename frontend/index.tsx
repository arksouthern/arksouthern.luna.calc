import { createMutable } from "solid-js/store"
import A from "@arksouthern/jsx/ax"
import HandleSet from "@arksouthern/jsx/hx"
import { createApi } from "~/lib/url"
import { App } from "~/Types"
import { XpWindow } from "~/components/luna/window"
import { XpTitleButtons, XpTitleButtonsClose, XpTitleButtonsNormal } from "~/components/luna/title-buttons"
import type { api } from "../backend"
import { kbdShortcutOn } from '~/lib/luna'
import { XpBarMenu, XpBarMenuDivider, XpBarMenuItem, XpBarMenuMasterItem } from "~/components/luna/bar-menu"
import { createAbout } from "~/components/luna/about"

const API = createApi<typeof api>("@arksouthern/luna.calc")

const INF = new Intl.NumberFormat(undefined)

export default function ProgArkSouthernLunaRun(props: App) {

	const self = createMutable({
		// numeric display value (last committed / calculated number)
		displayNumber: 0,
		// current input buffer while typing (kept as string for easy editing)
		input: null as string | null,
		// optional message to show (e.g. "Error")
		message: null as string | null,
		acc: 0,
		digitGroupingEnabled: false,
		pendingOp: null as "+" | "-" | "*" | "/" | "%" | null,
		waitingForOperand: false,
		get memoryHasStored() {
			return this.memory != null
		},
		memory: null as number | null,
		get value() {
			return Number(this.input ?? this.displayNumber)
		},
		get valueDisplay() {
			if (this.message) return this.message
			const num = this.input != null ? this.input : this.displayNumber
			let out = String(num)
			if (self.digitGroupingEnabled) 
				out = INF.format(Number(num))
			
			if (out.includes('.')) return out
			else return out + "."
		}
	})

	// props.app.sizeX = 16.25
	// props.app.sizeY = 15.7

	Object.defineProperty(props.app, "sizeX", { get() { return 16.25 } })
	Object.defineProperty(props.app, "sizeY", { get() { return 15.7 } })

	function CalcButton(props: { children: string, color?: "red", stretch?: true, onClick?: (e?: any) => void }) {
		return (
			<A.CalcButton 
				onClick={props.onClick} 
				data-stretch={props.stretch} 
				class="
					flex h-7 w-9 data-[stretch=true]:w-auto flex-1 rounded-sm border border-[#163B70] bg-[linear-gradient(#fff,#F0F0EA)] 
					[box-shadow:0_-1px_1px_#DBD6C4,0_1px_1px_#FAFAF6,inset_1px_1px_1px_#fff,inset_-1px_-1px_1px_#D5D0C6]
					hover:[box-shadow:inset_0_-1px_0px_0px_#e5a01a,inset_0_-2px_0px_0px_#fbc761,inset_0_1px_0px_0px_#fff0cf,inset_0_1px_0px_1px_#fdd889,inset_0_0px_0px_2px_#fbc761]
					active:bg-[linear-gradient(180deg,#cdcac3,#e3e3db_8%,#e5e5de_94%,#f2f2f1)] hover:cursor-default
					active:[box-shadow:inset_0_1px_1px_0px_#0003,inset_0_2px_1px_0px_#0001,inset_0_-1px_1px_0px_#fff6,inset_0_-2px_1px_0px_#fff3]
				"
			>
				<span data-color={props.color} class="m-auto data-[color=red]:text-[#f00] text-[#00f]">
					{props.children}
				</span>
			</A.CalcButton>
		)
	}

	// helper to apply a pending binary operation
	const applyPending = (value: number) => {
		if (!self.pendingOp) {
			self.acc = value
			return value
		}
		const a = self.acc
		const b = value
		let res: number
		switch (self.pendingOp) {
			case "+":
				res = a + b
				break
			case "-":
				res = a - b
				break
			case "*":
				res = a * b
				break
			case "/":
				if (b === 0) {
					self.message = "Cannot divide by zero"
					self.displayNumber = 0
					self.acc = 0
					self.pendingOp = null
					self.waitingForOperand = true
					return NaN
				}
				res = a / b
				break
			case "%":
				// percent behaves as (a * b / 100)
				res = a * (b / 100)
				break
			default:
				res = b
		}
		if (Number.isFinite(res)) {
			const rounded = Math.round((res + Number.EPSILON) * 1e12) / 1e12
			self.acc = rounded
			return rounded
		} else {
			self.message = "Infinite result"
			self.displayNumber = 0
			self.acc = 0
			self.pendingOp = null
			self.waitingForOperand = true
			return NaN
		}
	}

	const [About, setAbout] = createAbout({ app: props.app, offsetX: 4, offsetY: 2, sizeX: 30, sizeY: 18 })

	return (
		<A.ProgArkSouthernLunaRun>
			<XpWindow {...props} buttons={<XpTitleButtonsNormal {...props} />} title={
				<>
					<img class="ml-[.062rem] mr-1 w-3.5 h-3.5" src="/src/assets/xp-archive/calc_SC.ico" draggable="false" />
					<A.TitleText class="flex-1 pointer-events-none pr-1 tracking-[.032rem] overflow-hidden whitespace-nowrap text-ellipsis">
						Calculator
					</A.TitleText>
				</>
			}>
				<About progId="@arksouthern/luna.calc" license={{as: "full", title: "MIT"}} icon={"/src/assets/xp-archive/calc_SC.ico"} title={
					<>
						<A.TitleText class="flex-1 pointer-events-none pr-1 tracking-[.032rem] overflow-hidden whitespace-nowrap text-ellipsis">
							About Calculator
						</A.TitleText>
						<XpTitleButtons>
							<XpTitleButtonsClose {...props} onClick={() => setAbout.dialogHide()} />
						</XpTitleButtons>
					</>
				}>
					Replicating Microsoft's <small class="text-[0.75em]">&#174;</small> Calculator <br />
					Version 0.0.1 (Build 2025.11-16) <br />
					Arkansas Soft Construction, Inc. <br />
					<br />
				</About>
				<HandleSet 
					handlers={{
						numInput: (n: number | string) => {
							const s = String(n)
							// clear any message when typing
							if (self.message) self.message = null

							if (self.waitingForOperand || self.input == null) {
								if (s === '.') self.input = '0.'
								else self.input = s
								self.waitingForOperand = false
								return
							}

							if (s === '.') {
								if (!self.input.includes('.')) self.input = self.input + '.'
								return
							}

							if (self.input === '0') self.input = s
							else self.input = self.input + s
						},
						operatorMathPerform: (op: "+" | "-" | "*" | "/" | "%" | "sqrt" | "1/x" | "+/-") => {
							const opMap = {
								"sqrt": () => {
									const v = Number(self.input ?? self.displayNumber)
									if (v < 0) 
										self.message = 'Cannot square root a negative'
									else {
										const r = Math.sqrt(v)
										const rounded = Math.round((r + Number.EPSILON) * 1e12) / 1e12
										self.displayNumber = rounded
										self.input = null
										self.message = null
									}
									self.waitingForOperand = true
								},
								"1/x": () => {
									const v = Number(self.input ?? self.displayNumber)
									if (v === 0) 
										self.message = 'Cannot fraction over zero'
									else {
										const r = 1 / v
										const rounded = Math.round((r + Number.EPSILON) * 1e12) / 1e12
										self.displayNumber = rounded
										self.input = null
										self.message = null
									}
									self.waitingForOperand = true
								},
								"+/-": () => {
									if (self.input != null) {
										if (self.input === '0') return
										if (self.input.startsWith('-')) self.input = self.input.slice(1)
										else self.input = '-' + self.input
										return
									} else {
										self.displayNumber = -self.displayNumber
										return
									}
								}
							}
							if (op in opMap) opMap[op as keyof typeof opMap]()
							else {
								const current = Number(self.input ?? self.displayNumber)
								if (self.pendingOp && !self.waitingForOperand) {
									const r = applyPending(current)
									if (!Number.isNaN(Number(r))) {
										self.displayNumber = Number(r)
										self.input = null
										self.message = null
									}
								} else self.acc = current
								self.pendingOp = op as any
								self.waitingForOperand = true
							}
						},
						memoryPerform: (op: "MC" | "MR" | "MS" | "M+") => {
							const opMap = {
								'MC': () => {
									self.memory = null
									self.message = null
								},
								'MR': () => {
									if (self.memory == null) return
									self.input = String(self.memory)
									self.message = null
									self.waitingForOperand = true
								},
								'MS': () => {
									const v = Number(self.input ?? self.displayNumber)
									self.memory = v
									self.message = null
								},
								'M+': () => {
									const v = Number(self.input ?? self.displayNumber)
									self.memory = (self.memory ?? 0) + v
									self.message = null
								}
							} as Record<string, () => void>
							opMap[op]()
						},
						operatorGeneralPerform: (op: "backspace" | "ce" | "c" | "equals" | "copy" | "paste") => {
							const opMap = {
								'backspace': () => {
									if (self.waitingForOperand) return
									if (self.input == null) return
									
									if (self.input.length <= 1 || (self.input.length === 2 && self.input.startsWith('-'))) 
										self.input = '0'
									else
										self.input = self.input.slice(0, -1)
								},
								'ce': () => {
									self.input = '0'
									self.message = null
									self.waitingForOperand = true
								},
								'c': () => {
									self.input = null
									self.displayNumber = 0
									self.message = null
									self.acc = 0
									self.pendingOp = null
									self.waitingForOperand = false
								},
								'equals': () => {
									const current = Number(self.input ?? self.displayNumber)
									if (self.pendingOp) {
										const r = applyPending(current)
										if (!Number.isNaN(Number(r))) {
											self.displayNumber = Number(r)
											self.input = null
											self.message = null
										}
										self.pendingOp = null
									}
									self.waitingForOperand = true
								}
								,'copy': async () => {
									try {
										const text = self.input != null ? String(self.input) : String(self.displayNumber)
										if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard-unavailable')
										await navigator.clipboard.writeText(text)
										self.message = null
									} catch (e) {
										self.message = 'Clipboard unavailable'
									}
								},
								'paste': async () => {
									try {
										if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('clipboard-unavailable')
										const txt = await navigator.clipboard.readText()
										const cleaned = txt.trim().replace(/,/g, '')
										if (cleaned.length === 0) {
											self.message = 'Clipboard empty'
											return
										}
										const n = Number(cleaned)
										if (Number.isNaN(n)) {
											self.message = 'Clipboard does not contain a number'
											return
										}
										self.input = String(n)
										self.waitingForOperand = true
										self.message = null
									} catch (e) {
										self.message = 'Clipboard unavailable'
									}
								}
							}
							opMap[op]()
						}
					}}
				>
					{handlers => (
						<div class="flex-1 text-xs outline-none resize-none bg-[#ece9d8]">
							<A.AltBar class="relative h-5 text-xs">
								<>
									{kbdShortcutOn({app: props, keys: ["Ctrl", "C"], callback: () => handlers.operatorGeneralPerform('copy')})}
									{kbdShortcutOn({app: props, keys: ["Ctrl", "V"], callback: () => handlers.operatorGeneralPerform('paste')})}
								</>
								<XpBarMenu>
									<XpBarMenuItem name="Edit">
										<XpBarMenuMasterItem
											onClick={() => handlers.operatorGeneralPerform('copy')}
											title="Copy"
											shortcut="Ctrl+C"
										/>
										<XpBarMenuMasterItem
											onClick={() => handlers.operatorGeneralPerform('paste')}
											title="Paste"
											shortcut="Ctrl+V"
										/>
									</XpBarMenuItem>
									<XpBarMenuItem name="View">
										<XpBarMenuMasterItem
											onClick={async () => { }}
											title="Standard"
											indicator="radio"
										/>
										<XpBarMenuMasterItem
											onClick={async () => { }}
											title="Scientific"
											disabled
										/>
										<XpBarMenuDivider />
										<XpBarMenuMasterItem
											onClick={async () => {
												self.digitGroupingEnabled = !self.digitGroupingEnabled
											}}
											title="Digit Grouping"
											indicator={self.digitGroupingEnabled ? "checked" : undefined}
										/>
									</XpBarMenuItem>
									<XpBarMenuItem name="Help">
										<XpBarMenuMasterItem
											onClick={async () => { }}
											title="Help Topics"
											disabled
										/>
										<XpBarMenuDivider />
										<XpBarMenuMasterItem 
											onClick={setAbout.dialogShow} 
											title="About Calculator" 
										/>
									</XpBarMenuItem>
								</XpBarMenu>
							</A.AltBar>
							<A.BorderX class="border-t border-white" />
							<A.CalcDisplayBox class="px-2 pt-0.5">
								<A.ContextContainer class="border border-[#859CB6] bg-white relative flex  items-center">
									<input
										class="flex-1 outline-none w-[250px] h-5 text-right pb-0.5 pr-1"
										disabled
										value={self.valueDisplay}
									/>
								</A.ContextContainer>
							</A.CalcDisplayBox>

							<A.CalcTopButtons class="px-1.5 mt-2 mb-1 flex gap-1">

								<span class="w-9 flex">
									<A.Memory class="m-auto w-6 h-6 border border-t-[#ABA89B] border-l-[#ABA89B] border-b-white border-r-white">
										<A.Inner class="flex pl-px h-full w-full border border-t-[#716F65] border-l-[#716F65] border-b-[#F1EFE3] border-r-[#F1EFE3]">
											{self.memoryHasStored && (
												<span class="m-auto">M</span>
											)}
										</A.Inner>
									</A.Memory>
								</span>
								
								<span></span>

								<A.FlexButtons class="flex-1 flex gap-1">
									<CalcButton stretch color="red" onClick={() => handlers.operatorGeneralPerform('backspace')}>Backspace</CalcButton>
									<CalcButton stretch color="red" onClick={() => handlers.operatorGeneralPerform('ce')}>CE</CalcButton>
									<CalcButton stretch color="red" onClick={() => handlers.operatorGeneralPerform('c')}>C</CalcButton>
								</A.FlexButtons>

							</A.CalcTopButtons>

							<A.SpaceY class="h-1" />

							<A.CalcMainButtons class="px-1.5 pb-2 grid [grid:repeat(4,auto)_/_auto-flow] gap-1">
								<CalcButton color="red" onClick={() => handlers.memoryPerform('MC')}>MC</CalcButton>
								<CalcButton color="red" onClick={() => handlers.memoryPerform('MR')}>MR</CalcButton>
								<CalcButton color="red" onClick={() => handlers.memoryPerform('MS')}>MS</CalcButton>
								<CalcButton color="red" onClick={() => handlers.memoryPerform('M+')}>M+</CalcButton>
								
								<span></span><span></span><span></span><span></span>


								<CalcButton onClick={() => handlers.numInput(7)}>7</CalcButton>
								<CalcButton onClick={() => handlers.numInput(4)}>4</CalcButton>
								<CalcButton onClick={() => handlers.numInput(1)}>1</CalcButton>
								<CalcButton onClick={() => handlers.numInput(0)}>0</CalcButton>

								<CalcButton onClick={() => handlers.numInput(8)}>8</CalcButton>
								<CalcButton onClick={() => handlers.numInput(5)}>5</CalcButton>
								<CalcButton onClick={() => handlers.numInput(2)}>2</CalcButton>
								<CalcButton onClick={() => handlers.operatorMathPerform('+/-')}>+/-</CalcButton>

								<CalcButton onClick={() => handlers.numInput(9)}>9</CalcButton>
								<CalcButton onClick={() => handlers.numInput(6)}>6</CalcButton>
								<CalcButton onClick={() => handlers.numInput(3)}>3</CalcButton>
								<CalcButton onClick={() => handlers.numInput('.')}>.</CalcButton>


								<CalcButton color="red" onClick={() => handlers.operatorMathPerform('/')}>/</CalcButton>
								<CalcButton color="red" onClick={() => handlers.operatorMathPerform('*')}>*</CalcButton>
								<CalcButton color="red" onClick={() => handlers.operatorMathPerform('-')}>-</CalcButton>
								<CalcButton color="red" onClick={() => handlers.operatorMathPerform('+')}>+</CalcButton>

								<CalcButton onClick={() => handlers.operatorMathPerform('sqrt')}>sqrt</CalcButton>
								<CalcButton onClick={() => handlers.operatorMathPerform('%')}>%</CalcButton>
								<CalcButton onClick={() => handlers.operatorMathPerform('1/x')}>1/x</CalcButton>
								<CalcButton color="red" onClick={() => handlers.operatorGeneralPerform('equals')}>=</CalcButton>

							</A.CalcMainButtons>
						</div>
					)}
				</HandleSet>
			</XpWindow>
		</A.ProgArkSouthernLunaRun>
	)
}