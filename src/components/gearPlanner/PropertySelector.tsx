import {
  Autocomplete,
  Box,
  Chip,
  FormControl,
  TextField,
  Typography
} from '@mui/material'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MouseEvent } from 'react'

interface PropertySelectorProps {
  availableProperties: string[]
  selectedProperties: string[]
  onChange: (properties: string[]) => void
  availableSets?: string[]
  selectedSets?: string[]
  onSetsChange?: (sets: string[]) => void
}

// Sortable chip component for properties
function SortablePropertyChip({
  property,
  onDelete
}: {
  property: string
  onDelete: (event: MouseEvent) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: property })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DragIndicatorIcon
              sx={{ fontSize: 16, cursor: 'grab' }}
              {...attributes}
              {...listeners}
            />
            {property}
          </Box>
        }
        onDelete={onDelete}
        sx={{
          '& .MuiChip-label': {
            display: 'flex',
            alignItems: 'center'
          }
        }}
      />
    </div>
  )
}

// Sortable chip component for sets
function SortableSetChip({
  setName,
  onDelete
}: {
  setName: string
  onDelete: (event: MouseEvent) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: setName })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Chip
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DragIndicatorIcon
              sx={{ fontSize: 16, cursor: 'grab' }}
              {...attributes}
              {...listeners}
            />
            {setName}
          </Box>
        }
        onDelete={onDelete}
        sx={{
          '& .MuiChip-label': {
            display: 'flex',
            alignItems: 'center'
          }
        }}
      />
    </div>
  )
}

export default function PropertySelector({
  availableProperties,
  selectedProperties,
  onChange,
  availableSets,
  selectedSets,
  onSetsChange
}: PropertySelectorProps) {
  const propertySensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const setSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handlePropertyDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = selectedProperties.indexOf(active.id as string)
      const newIndex = selectedProperties.indexOf(over.id as string)
      onChange(arrayMove(selectedProperties, oldIndex, newIndex))
    }
  }

  const handleSetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && selectedSets && onSetsChange) {
      const oldIndex = selectedSets.indexOf(active.id as string)
      const newIndex = selectedSets.indexOf(over.id as string)
      onSetsChange(arrayMove(selectedSets, oldIndex, newIndex))
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Select Properties to Optimize
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select 3 or more properties to find the best gear combinations. Drag to reorder.
      </Typography>
      <FormControl fullWidth>
        <Autocomplete
          multiple
          options={availableProperties}
          value={selectedProperties}
          onChange={(_, newValue) => onChange(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Properties"
              placeholder={selectedProperties.length === 0 ? "Select properties..." : ""}
            />
          )}
          renderTags={(value, getTagProps) => (
            <DndContext
              sensors={propertySensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePropertyDragEnd}
            >
              <SortableContext
                items={value}
                strategy={verticalListSortingStrategy}
              >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {value.map((option, index) => {
                    const { onDelete } = getTagProps({ index })
                    return (
                      <SortablePropertyChip
                        key={option}
                        property={option}
                        onDelete={onDelete}
                      />
                    )
                  })}
                </Box>
              </SortableContext>
            </DndContext>
          )}
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          {selectedProperties.length} properties selected
          {selectedProperties.length < 3 && selectedProperties.length > 0 &&
            ` (minimum 3 required)`}
        </Typography>
      </FormControl>

      {/* Set Effects Selection */}
      {availableSets && onSetsChange && (
        <FormControl fullWidth sx={{ mt: 2 }}>
          <Autocomplete
            multiple
            options={availableSets}
            value={selectedSets || []}
            onChange={(_, newValue) => onSetsChange(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Set Effects to Prioritize (Optional)"
                placeholder={selectedSets?.length === 0 ? "Select set effects..." : ""}
              />
            )}
            renderTags={(value, getTagProps) => (
              <DndContext
                sensors={setSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSetDragEnd}
              >
                <SortableContext
                  items={value}
                  strategy={verticalListSortingStrategy}
                >
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {value.map((option, index) => {
                      const { onDelete } = getTagProps({ index })
                      return (
                        <SortableSetChip
                          key={option}
                          setName={option}
                          onDelete={onDelete}
                        />
                      )
                    })}
                  </Box>
                </SortableContext>
              </DndContext>
            )}
            sx={{ mb: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {selectedSets?.length || 0} set effects selected (optional filter)
          </Typography>
        </FormControl>
      )}
    </Box>
  )
}
