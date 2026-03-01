package handler

import (
	"context"

	"github.com/rs/zerolog/log"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "{{MODULE_PATH}}/api"
	"{{MODULE_PATH}}/internal/service"
)

// {{SERVICE_NAME_PASCAL}}Handler implements the gRPC server interface.
type {{SERVICE_NAME_PASCAL}}Handler struct {
	pb.Unimplemented{{SERVICE_NAME_PASCAL}}ServiceServer
	svc *service.{{SERVICE_NAME_PASCAL}}Service
}

// New{{SERVICE_NAME_PASCAL}}Handler creates a new handler with its dependencies wired up.
func New{{SERVICE_NAME_PASCAL}}Handler() *{{SERVICE_NAME_PASCAL}}Handler {
	return &{{SERVICE_NAME_PASCAL}}Handler{
		svc: service.New{{SERVICE_NAME_PASCAL}}Service(),
	}
}

// GetItem handles a GetItem RPC call.
func (h *{{SERVICE_NAME_PASCAL}}Handler) GetItem(ctx context.Context, req *pb.GetItemRequest) (*pb.GetItemResponse, error) {
	log.Ctx(ctx).Info().Str("id", req.Id).Msg("GetItem called")

	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	item, err := h.svc.GetItem(ctx, req.Id)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Str("id", req.Id).Msg("GetItem failed")
		return nil, status.Errorf(codes.Internal, "failed to get item: %v", err)
	}
	if item == nil {
		return nil, status.Errorf(codes.NotFound, "item %q not found", req.Id)
	}

	return &pb.GetItemResponse{Item: item}, nil
}

// ListItems handles a ListItems RPC call.
func (h *{{SERVICE_NAME_PASCAL}}Handler) ListItems(ctx context.Context, req *pb.ListItemsRequest) (*pb.ListItemsResponse, error) {
	log.Ctx(ctx).Info().Int32("page", req.Page).Int32("page_size", req.PageSize).Msg("ListItems called")

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	items, total, err := h.svc.ListItems(ctx, int(req.Page), int(pageSize), req.Filter)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("ListItems failed")
		return nil, status.Errorf(codes.Internal, "failed to list items: %v", err)
	}

	return &pb.ListItemsResponse{Items: items, TotalCount: int32(total)}, nil
}

// CreateItem handles a CreateItem RPC call.
func (h *{{SERVICE_NAME_PASCAL}}Handler) CreateItem(ctx context.Context, req *pb.CreateItemRequest) (*pb.CreateItemResponse, error) {
	log.Ctx(ctx).Info().Str("name", req.Name).Msg("CreateItem called")

	if req.Name == "" {
		return nil, status.Error(codes.InvalidArgument, "name is required")
	}

	item, err := h.svc.CreateItem(ctx, req.Name)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Msg("CreateItem failed")
		return nil, status.Errorf(codes.Internal, "failed to create item: %v", err)
	}

	return &pb.CreateItemResponse{Item: item}, nil
}

// UpdateItem handles an UpdateItem RPC call.
func (h *{{SERVICE_NAME_PASCAL}}Handler) UpdateItem(ctx context.Context, req *pb.UpdateItemRequest) (*pb.UpdateItemResponse, error) {
	log.Ctx(ctx).Info().Str("id", req.Id).Str("name", req.Name).Msg("UpdateItem called")

	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	item, err := h.svc.UpdateItem(ctx, req.Id, req.Name)
	if err != nil {
		log.Ctx(ctx).Error().Err(err).Str("id", req.Id).Msg("UpdateItem failed")
		return nil, status.Errorf(codes.Internal, "failed to update item: %v", err)
	}
	if item == nil {
		return nil, status.Errorf(codes.NotFound, "item %q not found", req.Id)
	}

	return &pb.UpdateItemResponse{Item: item}, nil
}

// DeleteItem handles a DeleteItem RPC call.
func (h *{{SERVICE_NAME_PASCAL}}Handler) DeleteItem(ctx context.Context, req *pb.DeleteItemRequest) (*pb.DeleteItemResponse, error) {
	log.Ctx(ctx).Info().Str("id", req.Id).Msg("DeleteItem called")

	if req.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "id is required")
	}

	if err := h.svc.DeleteItem(ctx, req.Id); err != nil {
		log.Ctx(ctx).Error().Err(err).Str("id", req.Id).Msg("DeleteItem failed")
		return nil, status.Errorf(codes.Internal, "failed to delete item: %v", err)
	}

	return &pb.DeleteItemResponse{Success: true}, nil
}
